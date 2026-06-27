from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from sqlalchemy import select, update, delete

from app.core.database import get_db
from app.core.security import get_current_user
from pydantic import BaseModel
from typing import Optional

class PatchUserProfile(BaseModel):
    name: Optional[str] = None
    full_name: Optional[str] = None  # frontend alias for name
    phone: Optional[str] = None
    email: Optional[str] = None
    language_pref: Optional[str] = None
    language_preference: Optional[str] = None  # frontend alias


router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me/", summary="Get current user profile")
async def get_me(current_user=Depends(get_current_user)):
    return {
        "id": str(current_user.id),
        "phone": current_user.phone,
        "full_name": current_user.name,
        "email": current_user.email,
        "role": current_user.role,
        "language_preference": current_user.language_pref,
        "is_active": current_user.is_active,
        "date_joined": current_user.created_at.isoformat(),
    }


@router.patch("/me/", summary="Update current user profile")
async def update_me(
    body: PatchUserProfile,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.models.user import User, FarmerProfile
    from app.models.order import Order, Cart
    from app.models.review import Review

    update_data = body.model_dump(exclude_unset=True)
    if "language_preference" in update_data:
        update_data["language_pref"] = update_data.pop("language_preference")
    if "full_name" in update_data:
        update_data["name"] = update_data.pop("full_name")

    new_phone = update_data.get("phone")

    # If the new phone belongs to a phone-only account, merge that account into current user
    if new_phone and new_phone != current_user.phone:
        result = await db.execute(select(User).where(User.phone == new_phone))
        duplicate = result.scalar_one_or_none()
        if duplicate and duplicate.id != current_user.id:
            if duplicate.email:
                raise HTTPException(
                    status_code=409,
                    detail="This phone number is linked to another account with an email. Please log in with that account.",
                )
            # Merge: reassign all records from duplicate → current user
            await db.execute(update(Order).where(Order.user_id == duplicate.id).values(user_id=current_user.id))
            await db.execute(update(Cart).where(Cart.user_id == duplicate.id).values(user_id=current_user.id))
            await db.execute(update(Review).where(Review.user_id == duplicate.id).values(user_id=current_user.id))
            await db.execute(delete(FarmerProfile).where(FarmerProfile.user_id == duplicate.id))
            await db.execute(delete(User).where(User.id == duplicate.id))

    for field, value in update_data.items():
        setattr(current_user, field, value)
    current_user.updated_at = datetime.utcnow()
    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Phone number already registered to another account")

    return {
        "id": str(current_user.id),
        "phone": current_user.phone,
        "full_name": current_user.name,
        "email": current_user.email,
        "role": current_user.role,
        "language_preference": current_user.language_pref,
        "is_active": current_user.is_active,
        "date_joined": current_user.created_at.isoformat(),
    }
