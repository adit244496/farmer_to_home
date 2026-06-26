from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

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
    update_data = body.model_dump(exclude_unset=True)
    if "language_preference" in update_data:
        update_data["language_pref"] = update_data.pop("language_preference")
    if "full_name" in update_data:
        update_data["name"] = update_data.pop("full_name")
    for field, value in update_data.items():
        setattr(current_user, field, value)
    current_user.updated_at = datetime.utcnow()
    await db.flush()
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
