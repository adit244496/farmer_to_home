from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
import redis.asyncio as aioredis

from app.core.database import get_db
from app.core.redis_client import get_redis, add_to_blocklist
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.auth import (
    OTPRequest,
    OTPVerify,
    EmailOTPRequest,
    EmailOTPVerify,
    CustomerRegister,
    FarmerRegister,
    TokenResponse,
    UserResponse,
    RefreshTokenRequest,
    LoginRequest,
    AdminLoginRequest,
)
from app.services import auth_service

bearer_scheme = HTTPBearer()

router = APIRouter(prefix="/auth", tags=["Authentication"])


def _build_token_response(
    user: User, access_token: str, refresh_token: str, is_new_user: bool = False
) -> TokenResponse:
    return TokenResponse(
        access=access_token,
        refresh=refresh_token,
        user=UserResponse(
            id=str(user.id),
            phone=user.phone,
            full_name=user.name,
            role=user.role,
            email=user.email,
            language_preference=user.language_pref,
            is_active=user.is_active,
            date_joined=user.created_at.isoformat(),
        ),
        is_new_user=is_new_user,
    )


@router.post("/otp/request/", summary="Request OTP for phone number")
async def request_otp(
    body: OTPRequest,
    db: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis),
):
    """Send a 6-digit OTP to the given phone number. Max 3 OTPs per hour."""
    return await auth_service.request_otp(body.phone, db, redis)


@router.post("/otp/verify/", response_model=TokenResponse, summary="Verify OTP and login")
async def verify_otp(
    body: OTPVerify,
    db: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis),
):
    """
    Verify OTP and return JWT tokens.
    If no account exists for this phone, a minimal customer account is created automatically.
    is_new_user=true signals the client to prompt for profile completion.
    """
    user, access_token, refresh_token, is_new_user = await auth_service.verify_otp_and_login(
        body.phone, body.otp, redis, db
    )
    return _build_token_response(user, access_token, refresh_token, is_new_user)


@router.post("/otp/email/request/", summary="Request OTP for email address")
async def request_email_otp(
    body: EmailOTPRequest,
    db: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis),
):
    """Send a 6-digit OTP to the given email. Only works for existing accounts. Max 3 OTPs per hour."""
    return await auth_service.request_email_otp(body.email, db, redis)


@router.post("/otp/email/verify/", response_model=TokenResponse, summary="Verify email OTP and login")
async def verify_email_otp(
    body: EmailOTPVerify,
    db: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis),
):
    """Verify email OTP and return JWT tokens."""
    user, access_token, refresh_token, is_new_user = await auth_service.verify_email_otp_and_login(
        body.email, body.otp, redis, db
    )
    return _build_token_response(user, access_token, refresh_token, is_new_user)


@router.post("/register/customer", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register_customer(
    body: CustomerRegister,
    db: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis),
):
    """Register a new customer account. OTP must be verified first."""
    user, access_token, refresh_token = await auth_service.register_customer(body, db, redis)
    return _build_token_response(user, access_token, refresh_token)


@router.post("/register/farmer", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register_farmer(
    body: FarmerRegister,
    db: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis),
):
    """Register a new farmer account. Farmer starts with PENDING status pending admin approval."""
    user, access_token, refresh_token = await auth_service.register_farmer(body, db, redis)
    return _build_token_response(user, access_token, refresh_token)


@router.post("/login", response_model=TokenResponse, summary="Farmer/Admin login with password")
async def login(
    body: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    """Login for farmers and admins using phone + password."""
    user, access_token, refresh_token = await auth_service.farmer_login(
        body.phone, body.password, db
    )
    return _build_token_response(user, access_token, refresh_token)


@router.post("/admin/login", response_model=TokenResponse, summary="Admin login with email + password")
async def admin_login(
    body: AdminLoginRequest,
    db: AsyncSession = Depends(get_db),
):
    """Login for admins using email + password."""
    user, access_token, refresh_token = await auth_service.admin_email_login(
        body.email, body.password, db
    )
    return _build_token_response(user, access_token, refresh_token)


@router.post("/token/refresh/", summary="Refresh access token")
async def refresh_token(body: RefreshTokenRequest):
    """Use refresh token to get a new access token."""
    new_access_token = await auth_service.refresh_access_token(body.refresh)
    return {"access": new_access_token, "token_type": "bearer"}


@router.post("/logout", summary="Logout and invalidate token")
async def logout(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    current_user=Depends(get_current_user),
    redis: aioredis.Redis = Depends(get_redis),
):
    """Logout the current user by blocklisting the access token."""
    await add_to_blocklist(credentials.credentials)
    return {"message": "Successfully logged out"}
