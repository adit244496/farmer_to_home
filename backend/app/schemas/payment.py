import uuid
from typing import Optional, Dict, Any

from pydantic import BaseModel


class RazorpayOrderCreate(BaseModel):
    order_id: uuid.UUID
    amount: int  # in paise


class RazorpayOrderOut(BaseModel):
    razorpay_order_id: str
    amount: int
    currency: str
    key_id: str
    order_id: uuid.UUID


class PaymentVerify(BaseModel):
    order_id: uuid.UUID
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


class PaymentVerifyResponse(BaseModel):
    success: bool
    message: str
    order_id: uuid.UUID
    payment_status: str


class WebhookPayload(BaseModel):
    entity: str
    account_id: Optional[str] = None
    event: str
    contains: list
    payload: Dict[str, Any]
    created_at: Optional[int] = None
