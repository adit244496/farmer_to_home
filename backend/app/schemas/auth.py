from pydantic import BaseModel, ConfigDict, field_validator
from typing import Optional


class OTPRequest(BaseModel):
    phone: str

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        v = v.strip()
        if not v.isdigit() or len(v) != 10:
            raise ValueError("Phone must be a 10-digit number")
        return v


class OTPVerify(BaseModel):
    phone: str
    otp: str

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        v = v.strip()
        if not v.isdigit() or len(v) != 10:
            raise ValueError("Phone must be a 10-digit number")
        return v

    @field_validator("otp")
    @classmethod
    def validate_otp(cls, v: str) -> str:
        v = v.strip()
        if not v.isdigit() or len(v) != 6:
            raise ValueError("OTP must be a 6-digit number")
        return v


class CustomerRegister(BaseModel):
    phone: str
    otp: str
    name: str
    email: Optional[str] = None
    language_pref: str = "mr"

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        v = v.strip()
        if not v.isdigit() or len(v) != 10:
            raise ValueError("Phone must be a 10-digit number")
        return v

    @field_validator("language_pref")
    @classmethod
    def validate_language(cls, v: str) -> str:
        if v not in ("mr", "en"):
            raise ValueError("language_pref must be 'mr' or 'en'")
        return v


class FarmerRegister(BaseModel):
    phone: str
    otp: str
    name: str
    email: Optional[str] = None
    password: str
    district: str
    taluka: str
    village: str
    farm_size_acres: float
    produce_types: list[str] = []
    bio: Optional[str] = None
    language_pref: str = "mr"

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        v = v.strip()
        if not v.isdigit() or len(v) != 10:
            raise ValueError("Phone must be a 10-digit number")
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class EmailOTPRequest(BaseModel):
    email: str

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        v = v.strip().lower()
        if "@" not in v or "." not in v.split("@")[-1]:
            raise ValueError("Invalid email address")
        return v


class EmailOTPVerify(BaseModel):
    email: str
    otp: str

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        v = v.strip().lower()
        if "@" not in v or "." not in v.split("@")[-1]:
            raise ValueError("Invalid email address")
        return v

    @field_validator("otp")
    @classmethod
    def validate_otp(cls, v: str) -> str:
        v = v.strip()
        if not v.isdigit() or len(v) != 6:
            raise ValueError("OTP must be a 6-digit number")
        return v


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    phone: Optional[str] = None
    full_name: Optional[str] = None
    role: str
    email: Optional[str] = None
    profile_photo: Optional[str] = None
    language_preference: str = "mr"
    is_active: bool = True
    date_joined: str


class TokenResponse(BaseModel):
    access: str
    refresh: str
    token_type: str = "bearer"
    user: UserResponse
    is_new_user: bool = False


# Kept for backward compat with refresh endpoint
class RefreshTokenRequest(BaseModel):
    refresh: str


class LoginRequest(BaseModel):
    phone: str
    password: str

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        v = v.strip()
        if not v.isdigit() or len(v) != 10:
            raise ValueError("Phone must be a 10-digit number")
        return v


class AdminLoginRequest(BaseModel):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        v = v.strip().lower()
        if "@" not in v or "." not in v.split("@")[-1]:
            raise ValueError("Invalid email address")
        return v
