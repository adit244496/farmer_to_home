import uuid
import logging
from datetime import datetime
from typing import Optional, Tuple

from fastapi import HTTPException, status, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import redis.asyncio as aioredis

from app.core.config import settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    verify_token,
    hash_password,
    verify_password,
)
from app.core.redis_client import (
    set_otp,
    verify_otp,
    get_rate_limit,
    increment_rate_limit,
    set_email_otp,
    verify_email_otp,
    get_email_rate_limit,
    increment_email_rate_limit,
    add_to_blocklist as redis_blocklist,
)
from app.models.user import User, FarmerProfile
from app.models.settings import SiteSetting
from app.schemas.auth import (
    CustomerRegister,
    FarmerRegister,
    TokenResponse,
)
from app.utils.otp import generate_otp, send_otp_sms, send_otp_email
from app.utils.s3 import upload_file_to_s3
from app.utils.notifications import create_notification

logger = logging.getLogger(__name__)

MAX_OTP_PER_HOUR = 3

_SMTP_KEYS = ["smtp_host", "smtp_port", "smtp_user", "smtp_password", "smtp_from_name"]


async def _load_smtp_settings(db: AsyncSession) -> Optional[dict]:
    """Load SMTP settings from DB. Returns None if not configured there."""
    result = await db.execute(select(SiteSetting).where(SiteSetting.key.in_(_SMTP_KEYS)))
    rows = {row.key: row.value for row in result.scalars().all()}
    if not rows.get("smtp_user") or not rows.get("smtp_password"):
        return None
    return {
        "host": rows.get("smtp_host") or settings.SMTP_HOST,
        "port": int(rows.get("smtp_port") or settings.SMTP_PORT),
        "user": rows["smtp_user"],
        "password": rows["smtp_password"],
        "from_name": rows.get("smtp_from_name") or settings.SMTP_FROM_NAME,
    }


async def request_otp(phone: str, db: AsyncSession, redis: aioredis.Redis) -> dict:
    """
    Request OTP for phone number with rate limiting (max 3 per hour).
    """
    count = await get_rate_limit(phone)
    if count >= MAX_OTP_PER_HOUR:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many OTP requests. Please try again after 1 hour.",
        )

    otp = generate_otp()
    await set_otp(phone, otp)
    await increment_rate_limit(phone)
    await send_otp_sms(phone, otp)

    return {"message": f"OTP sent to {phone}", "expires_in": settings.OTP_EXPIRY_MINUTES * 60}


async def verify_otp_and_login(
    phone: str, otp: str, redis: aioredis.Redis, db: AsyncSession
) -> Tuple[User, str, str, bool]:
    """
    Verify OTP and log in. If no account exists, auto-create a minimal customer account.
    Returns (user, access_token, refresh_token, is_new_user).
    """
    is_valid = await verify_otp(phone, otp)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP",
        )

    result = await db.execute(select(User).where(User.phone == phone))
    user = result.scalar_one_or_none()
    is_new_user = False

    if not user:
        user = User(
            id=uuid.uuid4(),
            phone=phone,
            role="customer",
            is_active=True,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(user)
        await db.flush()
        is_new_user = True
    elif not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated",
        )

    access_token = create_access_token({"sub": str(user.id), "role": user.role})
    refresh_token = create_refresh_token({"sub": str(user.id), "role": user.role})

    return user, access_token, refresh_token, is_new_user


async def register_customer(
    data: CustomerRegister, db: AsyncSession, redis: aioredis.Redis
) -> Tuple[User, str, str]:
    """
    Verify OTP and register a new customer account.
    """
    is_valid = await verify_otp(data.phone, data.otp)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP",
        )

    # Check if phone already registered
    result = await db.execute(select(User).where(User.phone == data.phone))
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Phone number already registered",
        )

    # Check email uniqueness
    if data.email:
        result = await db.execute(select(User).where(User.email == data.email))
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already registered",
            )

    user = User(
        id=uuid.uuid4(),
        phone=data.phone,
        email=data.email,
        name=data.name,
        role="customer",
        language_pref=data.language_pref,
        is_active=True,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(user)
    await db.flush()

    access_token = create_access_token({"sub": str(user.id), "role": user.role})
    refresh_token = create_refresh_token({"sub": str(user.id), "role": user.role})

    return user, access_token, refresh_token


async def register_farmer(
    data: FarmerRegister,
    db: AsyncSession,
    redis: aioredis.Redis,
    aadhaar_doc: Optional[UploadFile] = None,
    land_doc: Optional[UploadFile] = None,
    profile_photo: Optional[UploadFile] = None,
) -> Tuple[User, str, str]:
    """
    Verify OTP and register a new farmer account with profile.
    Farmer status starts as PENDING pending admin approval.
    """
    is_valid = await verify_otp(data.phone, data.otp)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP",
        )

    # Check existing user
    result = await db.execute(select(User).where(User.phone == data.phone))
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Phone number already registered",
        )

    if data.email:
        result = await db.execute(select(User).where(User.email == data.email))
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already registered",
            )

    # Upload documents
    aadhaar_url = None
    land_url = None
    photo_url = None

    if aadhaar_doc:
        content = await aadhaar_doc.read()
        aadhaar_url = await upload_file_to_s3(content, aadhaar_doc.filename, aadhaar_doc.content_type, "aadhaar")

    if land_doc:
        content = await land_doc.read()
        land_url = await upload_file_to_s3(content, land_doc.filename, land_doc.content_type, "land_docs")

    if profile_photo:
        content = await profile_photo.read()
        photo_url = await upload_file_to_s3(content, profile_photo.filename, profile_photo.content_type, "profiles")

    # Create user
    user = User(
        id=uuid.uuid4(),
        phone=data.phone,
        email=data.email,
        name=data.name,
        role="farmer",
        language_pref=data.language_pref,
        hashed_password=hash_password(data.password),
        is_active=True,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(user)
    await db.flush()

    # Create farmer profile
    farmer_profile = FarmerProfile(
        id=uuid.uuid4(),
        user_id=user.id,
        district=data.district,
        taluka=data.taluka,
        village=data.village,
        farm_size_acres=data.farm_size_acres,
        produce_types=data.produce_types,
        bio=data.bio,
        status="PENDING",
        aadhaar_doc_url=aadhaar_url,
        land_doc_url=land_url,
        profile_photo_url=photo_url,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(farmer_profile)
    await db.flush()

    # Notify admins (find admin users)
    result = await db.execute(select(User).where(User.role == "admin", User.is_active == True))
    admins = result.scalars().all()
    for admin in admins:
        await create_notification(
            db,
            admin.id,
            "NEW_FARMER_REGISTRATION",
            "New Farmer Registration",
            f"New farmer {data.name} from {data.district} has registered and needs approval.",
            {"farmer_id": str(user.id)},
        )

    access_token = create_access_token({"sub": str(user.id), "role": user.role})
    refresh_token = create_refresh_token({"sub": str(user.id), "role": user.role})

    return user, access_token, refresh_token


async def admin_email_login(email: str, password: str, db: AsyncSession) -> Tuple[User, str, str]:
    """Login admin with email + password."""
    result = await db.execute(
        select(User).where(User.email == email.strip().lower(), User.role == "admin")
    )
    user = result.scalar_one_or_none()

    if not user or not user.hashed_password or not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated",
        )

    access_token = create_access_token({"sub": str(user.id), "role": user.role})
    refresh_token = create_refresh_token({"sub": str(user.id), "role": user.role})
    return user, access_token, refresh_token


async def farmer_login(phone: str, password: str, db: AsyncSession) -> Tuple[User, str, str]:
    """
    Login farmer/admin with phone + password (no OTP required).
    """
    result = await db.execute(select(User).where(User.phone == phone))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid phone or password",
        )

    if user.role not in ("farmer", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This login method is for farmers and admins only",
        )

    if not user.hashed_password or not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid phone or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated",
        )

    access_token = create_access_token({"sub": str(user.id), "role": user.role})
    refresh_token = create_refresh_token({"sub": str(user.id), "role": user.role})

    return user, access_token, refresh_token


async def refresh_access_token(refresh_token: str) -> str:
    """
    Verify refresh token and return a new access token.
    """
    payload = verify_token(refresh_token)

    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
        )

    user_id = payload.get("sub")
    role = payload.get("role")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )

    new_access_token = create_access_token({"sub": user_id, "role": role})
    return new_access_token


async def request_email_otp(email: str, db: AsyncSession, redis: aioredis.Redis) -> dict:
    """
    Request OTP for an email address with rate limiting (max 3 per hour).
    Works for both existing users and new sign-ups.
    """
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if user and not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated",
        )

    count = await get_email_rate_limit(email)
    if count >= MAX_OTP_PER_HOUR:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many OTP requests. Please try again after 1 hour.",
        )

    otp = generate_otp()
    await set_email_otp(email, otp)
    await increment_email_rate_limit(email)
    smtp = await _load_smtp_settings(db)
    await send_otp_email(email, otp, smtp_override=smtp)

    return {"message": f"OTP sent to {email}", "expires_in": settings.OTP_EXPIRY_MINUTES * 60}


async def verify_email_otp_and_login(
    email: str, otp: str, redis: aioredis.Redis, db: AsyncSession
) -> Tuple[User, str, str, bool]:
    """
    Verify email OTP and log in. Auto-creates a minimal customer account on first login.
    Returns (user, access_token, refresh_token, is_new_user).
    """
    is_valid = await verify_email_otp(email, otp)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP",
        )

    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    is_new_user = False

    if not user:
        user = User(
            id=uuid.uuid4(),
            email=email,
            phone=None,
            role="customer",
            is_active=True,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(user)
        await db.flush()
        is_new_user = True
    elif not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated",
        )

    access_token = create_access_token({"sub": str(user.id), "role": user.role})
    refresh_token = create_refresh_token({"sub": str(user.id), "role": user.role})

    return user, access_token, refresh_token, is_new_user


async def customer_login(
    phone: Optional[str], email: Optional[str], password: str, db: AsyncSession
) -> Tuple[User, str, str]:
    """Login a customer using phone or email + password."""
    if phone:
        result = await db.execute(select(User).where(User.phone == phone, User.role == "customer"))
    else:
        result = await db.execute(
            select(User).where(User.email == email.strip().lower(), User.role == "customer")
        )
    user = result.scalar_one_or_none()

    if not user or not user.hashed_password or not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated",
        )

    access_token = create_access_token({"sub": str(user.id), "role": user.role})
    refresh_token = create_refresh_token({"sub": str(user.id), "role": user.role})
    return user, access_token, refresh_token


async def set_customer_password(user: User, password: str, db: AsyncSession) -> None:
    """Set or update password for a customer account."""
    user.hashed_password = hash_password(password)
    user.updated_at = datetime.utcnow()
    await db.flush()


async def logout(token: str, redis: aioredis.Redis) -> None:
    """
    Invalidate the access token by adding to blocklist.
    """
    await redis_blocklist(token)
