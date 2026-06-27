import uuid
from datetime import datetime
from typing import Optional, List

from sqlalchemy import (
    String, Boolean, Enum, Float, Integer, DateTime, ForeignKey, Text
)
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    phone: Mapped[Optional[str]] = mapped_column(String(15), unique=True, nullable=True, index=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), unique=True, nullable=True)
    name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    role: Mapped[str] = mapped_column(
        Enum("customer", "farmer", "admin", name="user_role"),
        default="customer",
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    language_pref: Mapped[str] = mapped_column(
        Enum("mr", "en", name="language_pref"),
        default="mr",
        nullable=False,
    )
    hashed_password: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    fcm_token: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationships
    farmer_profile: Mapped[Optional["FarmerProfile"]] = relationship(
        "FarmerProfile", back_populates="user", uselist=False
    )
    addresses: Mapped[List["Address"]] = relationship("Address", back_populates="user")
    cart_items: Mapped[List["Cart"]] = relationship("Cart", back_populates="user")
    orders: Mapped[List["Order"]] = relationship(
        "Order", back_populates="customer", foreign_keys="Order.customer_id"
    )
    reviews: Mapped[List["Review"]] = relationship("Review", back_populates="customer")
    notifications: Mapped[List["Notification"]] = relationship("Notification", back_populates="user")


class FarmerProfile(Base):
    __tablename__ = "farmer_profiles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    aadhaar_number: Mapped[Optional[str]] = mapped_column(String(12), nullable=True)
    district: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    taluka: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    village: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    farm_size_acres: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    produce_types: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String), nullable=True)
    status: Mapped[str] = mapped_column(
        Enum("PENDING", "APPROVED", "REJECTED", "SUSPENDED", name="farmer_status"),
        default="PENDING",
        nullable=False,
    )
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    rejected_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    bank_account_number: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    bank_ifsc: Mapped[Optional[str]] = mapped_column(String(11), nullable=True)
    bank_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    aadhaar_doc_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    land_doc_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    profile_photo_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    bio: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    farm_description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    rating: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    total_ratings: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="farmer_profile")
    media: Mapped[List["FarmerMedia"]] = relationship(
        "FarmerMedia", back_populates="farmer_profile",
        primaryjoin="FarmerProfile.user_id == FarmerMedia.farmer_id",
        foreign_keys="FarmerMedia.farmer_id",
        order_by="FarmerMedia.display_order",
    )


class FarmerMedia(Base):
    __tablename__ = "farmer_media"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    farmer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    url: Mapped[str] = mapped_column(String(512), nullable=False)
    media_type: Mapped[str] = mapped_column(String(10), nullable=False, default="image")
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    farmer_profile: Mapped["FarmerProfile"] = relationship(
        "FarmerProfile", back_populates="media",
        primaryjoin="FarmerMedia.farmer_id == FarmerProfile.user_id",
        foreign_keys="FarmerMedia.farmer_id",
    )


class Address(Base):
    __tablename__ = "addresses"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    label: Mapped[str] = mapped_column(String(50), default="Home", nullable=False)
    recipient_name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str] = mapped_column(String(15), nullable=False)
    house: Mapped[str] = mapped_column(String(255), nullable=False)
    area: Mapped[str] = mapped_column(String(255), nullable=False)
    city: Mapped[str] = mapped_column(String(100), nullable=False)
    pin_code: Mapped[str] = mapped_column(String(6), nullable=False)
    state: Mapped[str] = mapped_column(String(100), nullable=False)
    lat: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    lng: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="addresses")
    orders: Mapped[List["Order"]] = relationship("Order", back_populates="address")
