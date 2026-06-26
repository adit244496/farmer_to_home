import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User, Address
from app.models.review import Notification
from app.schemas.user import AddressCreate, AddressOut, UpdateUserProfile, UpdateFCMToken

router = APIRouter(prefix="/customers", tags=["Customers"])


@router.get("/me", summary="Get customer profile")
async def get_my_profile(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the logged-in customer's profile."""
    return {
        "id": str(current_user.id),
        "phone": current_user.phone,
        "email": current_user.email,
        "name": current_user.name,
        "role": current_user.role,
        "language_pref": current_user.language_pref,
        "created_at": current_user.created_at.isoformat(),
    }


@router.put("/me", summary="Update customer profile")
async def update_my_profile(
    body: UpdateUserProfile,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update the logged-in user's profile."""
    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(current_user, field, value)
    current_user.updated_at = datetime.utcnow()
    await db.flush()
    return {"message": "Profile updated successfully"}


@router.get("/me/addresses", response_model=list[AddressOut], summary="List addresses")
async def get_addresses(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all addresses for the logged-in user."""
    result = await db.execute(
        select(Address)
        .where(Address.user_id == current_user.id)
        .order_by(Address.is_default.desc(), Address.created_at.desc())
    )
    return result.scalars().all()


@router.post("/me/addresses", response_model=AddressOut, status_code=status.HTTP_201_CREATED,
             summary="Add address")
async def add_address(
    body: AddressCreate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Add a new delivery address."""
    # If this is marked as default, unset other defaults
    if body.is_default:
        result = await db.execute(
            select(Address).where(Address.user_id == current_user.id, Address.is_default == True)
        )
        existing_defaults = result.scalars().all()
        for addr in existing_defaults:
            addr.is_default = False

    address = Address(
        id=uuid.uuid4(),
        user_id=current_user.id,
        label=body.label,
        recipient_name=body.recipient_name,
        phone=body.phone,
        house=body.house,
        area=body.area,
        city=body.city,
        pin_code=body.pin_code,
        state=body.state,
        lat=body.lat,
        lng=body.lng,
        is_default=body.is_default,
        created_at=datetime.utcnow(),
    )
    db.add(address)
    await db.flush()
    await db.refresh(address)
    return address


@router.put("/me/addresses/{address_id}", response_model=AddressOut, summary="Update address")
async def update_address(
    address_id: uuid.UUID,
    body: AddressCreate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing address."""
    result = await db.execute(
        select(Address).where(Address.id == address_id, Address.user_id == current_user.id)
    )
    address = result.scalar_one_or_none()
    if not address:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Address not found")

    if body.is_default and not address.is_default:
        existing = await db.execute(
            select(Address).where(Address.user_id == current_user.id, Address.is_default == True)
        )
        for addr in existing.scalars().all():
            addr.is_default = False

    for field, value in body.model_dump().items():
        setattr(address, field, value)

    await db.flush()
    await db.refresh(address)
    return address


@router.delete("/me/addresses/{address_id}", summary="Delete address")
async def delete_address(
    address_id: uuid.UUID,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete an address."""
    result = await db.execute(
        select(Address).where(Address.id == address_id, Address.user_id == current_user.id)
    )
    address = result.scalar_one_or_none()
    if not address:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Address not found")

    await db.delete(address)
    await db.flush()
    return {"message": "Address deleted"}


@router.patch("/me/addresses/{address_id}/default", summary="Set default address")
async def set_default_address(
    address_id: uuid.UUID,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Set an address as the default delivery address."""
    # Unset current default
    result = await db.execute(
        select(Address).where(Address.user_id == current_user.id)
    )
    addresses = result.scalars().all()
    for addr in addresses:
        addr.is_default = (addr.id == address_id)

    target = next((a for a in addresses if a.id == address_id), None)
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Address not found")

    await db.flush()
    return {"message": "Default address updated"}


@router.get("/me/notifications", summary="List notifications")
async def get_notifications(
    unread_only: bool = False,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get notifications for the logged-in user."""
    from sqlalchemy import func
    stmt = select(Notification).where(Notification.user_id == current_user.id)
    if unread_only:
        stmt = stmt.where(Notification.is_read == False)

    count_result = await db.execute(select(func.count()).select_from(stmt.subquery()))
    total = count_result.scalar() or 0

    offset = (page - 1) * page_size
    stmt = stmt.order_by(Notification.created_at.desc()).offset(offset).limit(page_size)
    result = await db.execute(stmt)
    notifications = result.scalars().all()

    return {
        "items": [
            {
                "id": str(n.id),
                "type": n.type,
                "title": n.title,
                "body": n.body,
                "is_read": n.is_read,
                "data": n.data,
                "created_at": n.created_at.isoformat(),
            }
            for n in notifications
        ],
        "total": total,
        "unread_count": sum(1 for n in notifications if not n.is_read),
    }


@router.patch("/me/notifications/{notification_id}/read", summary="Mark notification as read")
async def mark_notification_read(
    notification_id: uuid.UUID,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark a specific notification as read."""
    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == current_user.id,
        )
    )
    notification = result.scalar_one_or_none()
    if not notification:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")

    notification.is_read = True
    await db.flush()
    return {"message": "Notification marked as read"}


@router.patch("/me/notifications/read-all", summary="Mark all notifications as read")
async def mark_all_notifications_read(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark all notifications as read for the logged-in user."""
    result = await db.execute(
        select(Notification).where(
            Notification.user_id == current_user.id,
            Notification.is_read == False,
        )
    )
    notifications = result.scalars().all()
    for n in notifications:
        n.is_read = True

    await db.flush()
    return {"message": f"Marked {len(notifications)} notifications as read"}


@router.put("/me/fcm-token", summary="Update FCM push token")
async def update_fcm_token(
    body: UpdateFCMToken,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update the Firebase Cloud Messaging token for push notifications."""
    current_user.fcm_token = body.fcm_token
    current_user.updated_at = datetime.utcnow()
    await db.flush()
    return {"message": "FCM token updated"}
