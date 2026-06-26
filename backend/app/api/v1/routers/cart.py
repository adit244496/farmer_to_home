import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.schemas.order import CartAdd, ApplyPromoRequest
from app.services import order_service

router = APIRouter(prefix="/cart", tags=["Cart"])


@router.get("/", summary="Get cart with totals")
async def get_cart(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the current user's cart with item subtotals, delivery charges, and total."""
    cart = await order_service.get_cart(current_user.id, db)
    return {
        "items": [
            {
                "id": str(item["id"]),
                "product_id": str(item["product_id"]),
                "product_name_en": item["product_name_en"],
                "product_name_mr": item["product_name_mr"],
                "product_price": float(item["product_price"]),
                "product_unit": item["product_unit"],
                "primary_image": item["primary_image"],
                "quantity": item["quantity"],
                "subtotal": float(item["subtotal"]),
                "added_at": item["added_at"].isoformat(),
            }
            for item in cart["items"]
        ],
        "subtotal": float(cart["subtotal"]),
        "delivery_charge": float(cart["delivery_charge"]),
        "discount": float(cart["discount"]),
        "total": float(cart["total"]),
        "promo_code": cart["promo_code"],
        "item_count": len(cart["items"]),
    }


@router.post("/items", status_code=status.HTTP_201_CREATED, summary="Add item to cart")
async def add_to_cart(
    body: CartAdd,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Add a product to the cart. If already in cart, sets quantity to the provided value."""
    cart_item = await order_service.add_to_cart(
        current_user.id, body.product_id, body.quantity, db
    )
    return {"message": "Item added to cart", "cart_item_id": str(cart_item.id)}


@router.put("/items/{product_id}", summary="Update cart item quantity")
async def update_cart_item(
    product_id: uuid.UUID,
    body: dict,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update quantity of a cart item. Set to 0 to remove."""
    quantity = body.get("quantity")
    if quantity is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="quantity is required")

    result = await order_service.update_cart_quantity(current_user.id, product_id, int(quantity), db)
    if result is None:
        return {"message": "Item removed from cart"}
    return {"message": "Quantity updated", "new_quantity": result.quantity}


@router.delete("/items/{product_id}", summary="Remove item from cart")
async def remove_from_cart(
    product_id: uuid.UUID,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove a specific product from the cart."""
    await order_service.remove_from_cart(current_user.id, product_id, db)
    return {"message": "Item removed from cart"}


@router.post("/apply-promo", summary="Apply promo code")
async def apply_promo(
    body: ApplyPromoRequest,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Validate and apply a promo code to get discount amount."""
    result = await order_service.apply_promo(current_user.id, body.code, db)
    return result


@router.delete("/promo", summary="Remove promo code")
async def remove_promo(current_user=Depends(get_current_user)):
    """Remove the applied promo code from the cart session."""
    return {"message": "Promo code removed"}
