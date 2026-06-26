import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional, List

from sqlalchemy import (
    String, Boolean, Enum, Integer, DateTime, ForeignKey, Text, Numeric
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Cart(Base):
    __tablename__ = "cart"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False
    )
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    added_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="cart_items")
    product: Mapped["Product"] = relationship("Product", back_populates="cart_items")


class PromoCode(Base):
    __tablename__ = "promo_codes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    discount_type: Mapped[str] = mapped_column(
        Enum("PERCENT", "FLAT", name="discount_type"), nullable=False
    )
    discount_value: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    min_order_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0, nullable=False)
    max_uses: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    used_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    customer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    address_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("addresses.id"), nullable=False
    )
    status: Mapped[str] = mapped_column(
        Enum(
            "PLACED",
            "CONFIRMED",
            "PACKED",
            "DISPATCHED",
            "DELIVERED",
            "COMPLETED",
            "CANCELLED_BY_CUSTOMER",
            "CANCELLED_BY_FARMER",
            "CANCELLED_BY_ADMIN",
            name="order_status",
        ),
        default="PLACED",
        nullable=False,
    )
    payment_method: Mapped[str] = mapped_column(
        Enum("COD", "UPI", "CARD", "NET_BANKING", name="payment_method"), nullable=False
    )
    payment_status: Mapped[str] = mapped_column(
        Enum("PENDING", "PENDING_COD", "CONFIRMED", "FAILED", "REFUNDED", name="payment_status"),
        default="PENDING",
        nullable=False,
    )
    razorpay_order_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    razorpay_payment_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    promo_code: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    discount_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0, nullable=False)
    delivery_charge: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0, nullable=False)
    total_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    cancelled_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    tracking_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    carrier_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationships
    customer: Mapped["User"] = relationship("User", foreign_keys=[customer_id], back_populates="orders")
    address: Mapped["Address"] = relationship("Address", back_populates="orders")
    items: Mapped[List["OrderItem"]] = relationship(
        "OrderItem", back_populates="order", cascade="all, delete-orphan"
    )
    reviews: Mapped[List["Review"]] = relationship("Review", back_populates="order")


class OrderItem(Base):
    __tablename__ = "order_items"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("products.id"), nullable=False
    )
    farmer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    subtotal: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)

    # Relationships
    order: Mapped["Order"] = relationship("Order", back_populates="items")
    product: Mapped["Product"] = relationship("Product", back_populates="order_items")
    farmer: Mapped["User"] = relationship("User", foreign_keys=[farmer_id])
