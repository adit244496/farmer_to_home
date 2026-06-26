import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.schemas.order import OrderCreate, CancelOrder
from app.services import order_service

router = APIRouter(prefix="/orders", tags=["Orders"])


@router.post("/", status_code=status.HTTP_201_CREATED, summary="Place an order")
async def place_order(
    body: OrderCreate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Place an order from the current cart.
    For online payments, use the returned order_id with /payments/initiate.
    """
    order = await order_service.place_order(
        current_user.id,
        body.address_id,
        body.payment_method,
        body.promo_code,
        db,
    )
    return {
        "message": "Order placed successfully",
        "order_id": str(order.id),
        "status": order.status,
        "payment_method": order.payment_method,
        "total_amount": float(order.total_amount),
    }


@router.get("/", summary="Order history")
async def get_order_history(
    order_status: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get paginated order history for the logged-in customer."""
    result = await order_service.get_order_history(
        current_user.id, db, order_status, page, page_size
    )
    return {
        "items": [
            {
                "id": str(o.id),
                "status": o.status,
                "payment_method": o.payment_method,
                "payment_status": o.payment_status,
                "total_amount": float(o.total_amount),
                "item_count": len(o.items),
                "created_at": o.created_at.isoformat(),
            }
            for o in result["items"]
        ],
        "total": result["total"],
        "page": result["page"],
        "pages": result["pages"],
    }


@router.get("/{order_id}", summary="Order detail")
async def get_order_detail(
    order_id: uuid.UUID,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get full details of a specific order."""
    order = await order_service.get_order_detail(order_id, current_user.id, db)

    return {
        "id": str(order.id),
        "status": order.status,
        "payment_method": order.payment_method,
        "payment_status": order.payment_status,
        "promo_code": order.promo_code,
        "discount_amount": float(order.discount_amount),
        "delivery_charge": float(order.delivery_charge),
        "total_amount": float(order.total_amount),
        "tracking_number": order.tracking_number,
        "carrier_name": order.carrier_name,
        "cancelled_reason": order.cancelled_reason,
        "address": {
            "recipient_name": order.address.recipient_name,
            "phone": order.address.phone,
            "house": order.address.house,
            "area": order.address.area,
            "city": order.address.city,
            "pin_code": order.address.pin_code,
            "state": order.address.state,
        } if order.address else None,
        "items": [
            {
                "id": str(item.id),
                "product_id": str(item.product_id),
                "product_name": item.product.name_en if item.product else "Unknown",
                "farmer_id": str(item.farmer_id),
                "quantity": item.quantity,
                "unit_price": float(item.unit_price),
                "subtotal": float(item.subtotal),
                "primary_image": next(
                    (img.image_url for img in item.product.images if img.is_primary),
                    item.product.images[0].image_url if item.product and item.product.images else None,
                ) if item.product else None,
            }
            for item in order.items
        ],
        "created_at": order.created_at.isoformat(),
        "updated_at": order.updated_at.isoformat(),
    }


@router.post("/{order_id}/cancel", summary="Cancel order")
async def cancel_order(
    order_id: uuid.UUID,
    body: CancelOrder,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Cancel an order within the 1-hour cancellation window."""
    order = await order_service.cancel_order(order_id, current_user.id, body.reason, db)
    return {
        "message": "Order cancelled successfully",
        "order_id": str(order.id),
        "status": order.status,
    }


@router.get("/{order_id}/tracking", summary="Order tracking status")
async def get_order_tracking(
    order_id: uuid.UUID,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get tracking information for an order."""
    order = await order_service.get_order_detail(order_id, current_user.id, db)

    return {
        "order_id": str(order.id),
        "status": order.status,
        "tracking_number": order.tracking_number,
        "carrier_name": order.carrier_name,
        "payment_status": order.payment_status,
        "timeline": _get_order_timeline(order.status),
        "updated_at": order.updated_at.isoformat(),
    }


def _get_order_timeline(current_status: str) -> list:
    """Generate order status timeline."""
    steps = ["PLACED", "CONFIRMED", "PACKED", "DISPATCHED", "DELIVERED", "COMPLETED"]
    cancelled = ["CANCELLED_BY_CUSTOMER", "CANCELLED_BY_FARMER", "CANCELLED_BY_ADMIN"]

    if current_status in cancelled:
        return [{"step": current_status, "completed": True, "is_current": True}]

    timeline = []
    current_index = steps.index(current_status) if current_status in steps else -1

    for idx, step in enumerate(steps):
        timeline.append({
            "step": step,
            "completed": idx <= current_index,
            "is_current": idx == current_index,
        })

    return timeline
