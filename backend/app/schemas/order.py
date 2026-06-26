import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional, List

from pydantic import BaseModel, ConfigDict, field_validator


class CartAdd(BaseModel):
    product_id: uuid.UUID
    quantity: int

    @field_validator("quantity")
    @classmethod
    def validate_quantity(cls, v: int) -> int:
        if v < 1:
            raise ValueError("Quantity must be at least 1")
        return v


class CartItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    product_id: uuid.UUID
    product_name_en: str
    product_name_mr: str
    product_price: Decimal
    product_unit: str
    primary_image: Optional[str] = None
    quantity: int
    subtotal: Decimal
    added_at: datetime


class CartOut(BaseModel):
    items: List[CartItemOut]
    subtotal: Decimal
    delivery_charge: Decimal
    discount: Decimal
    total: Decimal
    promo_code: Optional[str] = None


class OrderCreate(BaseModel):
    address_id: uuid.UUID
    payment_method: str
    promo_code: Optional[str] = None

    @field_validator("payment_method")
    @classmethod
    def validate_payment_method(cls, v: str) -> str:
        valid = {"COD", "UPI", "CARD", "NET_BANKING"}
        if v not in valid:
            raise ValueError(f"payment_method must be one of {valid}")
        return v


class OrderItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    product_id: uuid.UUID
    farmer_id: uuid.UUID
    quantity: int
    unit_price: Decimal
    subtotal: Decimal


class OrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    customer_id: uuid.UUID
    address_id: uuid.UUID
    status: str
    payment_method: str
    payment_status: str
    razorpay_order_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    promo_code: Optional[str] = None
    discount_amount: Decimal
    delivery_charge: Decimal
    total_amount: Decimal
    cancelled_reason: Optional[str] = None
    tracking_number: Optional[str] = None
    carrier_name: Optional[str] = None
    items: List[OrderItemOut] = []
    created_at: datetime
    updated_at: datetime


class OrderStatusUpdate(BaseModel):
    status: str
    tracking_number: Optional[str] = None
    carrier_name: Optional[str] = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        valid = {
            "CONFIRMED", "PACKED", "DISPATCHED", "DELIVERED", "COMPLETED",
            "CANCELLED_BY_FARMER", "CANCELLED_BY_ADMIN"
        }
        if v not in valid:
            raise ValueError(f"status must be one of {valid}")
        return v


class CancelOrder(BaseModel):
    reason: Optional[str] = None


class PromoCodeCreate(BaseModel):
    code: str
    discount_type: str
    discount_value: Decimal
    min_order_amount: Decimal = Decimal("0")
    max_uses: Optional[int] = None
    expires_at: Optional[datetime] = None

    @field_validator("discount_type")
    @classmethod
    def validate_discount_type(cls, v: str) -> str:
        if v not in ("PERCENT", "FLAT"):
            raise ValueError("discount_type must be 'PERCENT' or 'FLAT'")
        return v

    @field_validator("code")
    @classmethod
    def validate_code(cls, v: str) -> str:
        return v.upper().strip()


class PromoCodeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    code: str
    discount_type: str
    discount_value: Decimal
    min_order_amount: Decimal
    max_uses: Optional[int] = None
    used_count: int
    is_active: bool
    expires_at: Optional[datetime] = None
    created_at: datetime


class ApplyPromoRequest(BaseModel):
    code: str
    order_amount: Decimal


class ApplyPromoResponse(BaseModel):
    valid: bool
    discount_amount: Decimal
    message: str
