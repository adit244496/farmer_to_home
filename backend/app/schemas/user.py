import uuid
from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, ConfigDict, EmailStr


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    phone: str
    email: Optional[str] = None
    name: Optional[str] = None
    role: str
    is_active: bool
    language_pref: str
    fcm_token: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class FarmerProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    district: Optional[str] = None
    taluka: Optional[str] = None
    village: Optional[str] = None
    farm_size_acres: Optional[float] = None
    produce_types: Optional[List[str]] = None
    status: str
    rejection_reason: Optional[str] = None
    rejected_at: Optional[datetime] = None
    bank_account_number: Optional[str] = None
    bank_ifsc: Optional[str] = None
    bank_name: Optional[str] = None
    aadhaar_doc_url: Optional[str] = None
    land_doc_url: Optional[str] = None
    profile_photo_url: Optional[str] = None
    bio: Optional[str] = None
    farm_description: Optional[str] = None
    rating: float
    total_ratings: int
    approved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class FarmerProfileUpdate(BaseModel):
    district: Optional[str] = None
    taluka: Optional[str] = None
    village: Optional[str] = None
    farm_size_acres: Optional[float] = None
    produce_types: Optional[List[str]] = None
    bio: Optional[str] = None
    farm_description: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_ifsc: Optional[str] = None
    bank_name: Optional[str] = None


class AddressCreate(BaseModel):
    label: str = "Home"
    recipient_name: str
    phone: str
    house: str
    area: str
    city: str
    pin_code: str
    state: str
    lat: Optional[float] = None
    lng: Optional[float] = None
    is_default: bool = False


class AddressOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    label: str
    recipient_name: str
    phone: str
    house: str
    area: str
    city: str
    pin_code: str
    state: str
    lat: Optional[float] = None
    lng: Optional[float] = None
    is_default: bool
    created_at: datetime


class FarmerPublicOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: Optional[str] = None
    profile_photo_url: Optional[str] = None
    district: Optional[str] = None
    taluka: Optional[str] = None
    village: Optional[str] = None
    produce_types: Optional[List[str]] = None
    bio: Optional[str] = None
    farm_description: Optional[str] = None
    rating: float
    total_ratings: int


class UpdateUserProfile(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    language_pref: Optional[str] = None


class UpdateFCMToken(BaseModel):
    fcm_token: str
