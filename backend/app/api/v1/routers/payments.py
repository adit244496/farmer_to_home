import hashlib
import hmac
import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.order import Order
from app.schemas.payment import RazorpayOrderCreate, PaymentVerify
from app.services.order_service import (
    create_razorpay_order,
    verify_payment,
    get_razorpay_client,
)

router = APIRouter(prefix="/payments", tags=["Payments"])
logger = logging.getLogger(__name__)


@router.post("/initiate", summary="Initiate Razorpay payment")
async def initiate_payment(
    body: RazorpayOrderCreate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a Razorpay order for online payment.
    Call this after placing an order (payment_method: UPI/CARD/NET_BANKING).
    """
    result = await db.execute(
        select(Order).where(Order.id == body.order_id, Order.customer_id == current_user.id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    if order.payment_status not in ("PENDING",):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment already processed for this order",
        )

    # Amount in paise (₹ * 100)
    amount_paise = int(order.total_amount * 100)

    razorpay_client = get_razorpay_client()
    rz_order = await create_razorpay_order(amount_paise, body.order_id, razorpay_client)

    # Store razorpay_order_id
    order.razorpay_order_id = rz_order["id"]
    await db.flush()

    return {
        "razorpay_order_id": rz_order["id"],
        "amount": amount_paise,
        "currency": "INR",
        "key_id": settings.RAZORPAY_KEY_ID,
        "order_id": str(body.order_id),
    }


@router.post("/verify", summary="Verify payment signature")
async def verify_payment_endpoint(
    body: PaymentVerify,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Verify Razorpay payment signature after successful payment."""
    order = await verify_payment(
        body.order_id,
        body.razorpay_order_id,
        body.razorpay_payment_id,
        body.razorpay_signature,
        db,
    )

    return {
        "success": True,
        "message": "Payment verified successfully",
        "order_id": str(order.id),
        "payment_status": order.payment_status,
    }


@router.post("/webhook", include_in_schema=False)
async def razorpay_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """
    Razorpay webhook handler.
    Verifies webhook signature and processes payment events.
    """
    body = await request.body()
    signature = request.headers.get("X-Razorpay-Signature", "")

    # Verify webhook signature
    expected = hmac.new(
        settings.RAZORPAY_KEY_SECRET.encode("utf-8"),
        body,
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(expected, signature):
        logger.warning("Invalid webhook signature")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid signature")

    import json
    payload = json.loads(body)
    event = payload.get("event", "")

    logger.info(f"Razorpay webhook received: {event}")

    if event == "payment.captured":
        payment = payload.get("payload", {}).get("payment", {}).get("entity", {})
        razorpay_payment_id = payment.get("id")
        razorpay_order_id = payment.get("order_id")

        if razorpay_order_id:
            result = await db.execute(
                select(Order).where(Order.razorpay_order_id == razorpay_order_id)
            )
            order = result.scalar_one_or_none()
            if order and order.payment_status == "PENDING":
                order.razorpay_payment_id = razorpay_payment_id
                order.payment_status = "CONFIRMED"
                await db.flush()
                logger.info(f"Payment confirmed for order {order.id}")

    elif event == "payment.failed":
        payment = payload.get("payload", {}).get("payment", {}).get("entity", {})
        razorpay_order_id = payment.get("order_id")

        if razorpay_order_id:
            result = await db.execute(
                select(Order).where(Order.razorpay_order_id == razorpay_order_id)
            )
            order = result.scalar_one_or_none()
            if order:
                order.payment_status = "FAILED"
                await db.flush()
                logger.info(f"Payment failed for order {order.id}")

    elif event == "refund.processed":
        refund = payload.get("payload", {}).get("refund", {}).get("entity", {})
        razorpay_payment_id = refund.get("payment_id")

        if razorpay_payment_id:
            result = await db.execute(
                select(Order).where(Order.razorpay_payment_id == razorpay_payment_id)
            )
            order = result.scalar_one_or_none()
            if order:
                order.payment_status = "REFUNDED"
                await db.flush()
                logger.info(f"Refund processed for order {order.id}")

    return {"status": "ok"}
