import uuid
import hmac
import hashlib
import logging
from datetime import datetime, timedelta
from decimal import Decimal
from typing import List, Optional, Dict, Any, Tuple

import razorpay
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, update
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.models.product import Product
from app.models.order import Cart, Order, OrderItem, PromoCode
from app.models.user import User, Address
from app.utils.notifications import create_notification

logger = logging.getLogger(__name__)

_COMMERCE_DEFAULTS = {
    "delivery_charge": Decimal("30"),
    "free_delivery_threshold": Decimal("300"),
    "min_order_value": Decimal("0"),
    "cart_discount_percent": Decimal("0"),
    "gst_percent": Decimal("0"),
}


async def _load_commerce_settings(db: AsyncSession) -> dict:
    from app.models.settings import SiteSetting
    result = await db.execute(select(SiteSetting).where(SiteSetting.key.in_(_COMMERCE_DEFAULTS.keys())))
    rows = {r.key: r.value for r in result.scalars().all()}
    return {k: Decimal(rows[k]) if rows.get(k) else v for k, v in _COMMERCE_DEFAULTS.items()}


def get_razorpay_client() -> razorpay.Client:
    return razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))


async def add_to_cart(
    user_id: uuid.UUID,
    product_id: uuid.UUID,
    quantity: int,
    db: AsyncSession,
) -> Cart:
    """Add item to cart, validate stock availability."""
    # Validate product
    result = await db.execute(
        select(Product).where(Product.id == product_id, Product.status == "ACTIVE")
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    if quantity < product.min_order_qty:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Minimum order quantity is {product.min_order_qty}",
        )

    if product.stock < quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Only {product.stock} units available",
        )

    # Check if already in cart
    result = await db.execute(
        select(Cart).where(Cart.user_id == user_id, Cart.product_id == product_id)
    )
    cart_item = result.scalar_one_or_none()

    if cart_item:
        total_qty = quantity
        if total_qty > product.stock:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Only {product.stock} units available",
            )
        cart_item.quantity = total_qty
    else:
        cart_item = Cart(
            id=uuid.uuid4(),
            user_id=user_id,
            product_id=product_id,
            quantity=quantity,
            added_at=datetime.utcnow(),
        )
        db.add(cart_item)

    await db.flush()
    await db.refresh(cart_item)
    return cart_item


async def get_cart(
    user_id: uuid.UUID,
    db: AsyncSession,
) -> Dict[str, Any]:
    """Get cart with items, subtotals, delivery charge, and totals."""
    result = await db.execute(
        select(Cart)
        .options(
            selectinload(Cart.product).selectinload(Product.images),
            selectinload(Cart.product).selectinload(Product.farmer),
        )
        .where(Cart.user_id == user_id)
        .order_by(Cart.added_at)
    )
    cart_items = result.scalars().all()

    items = []
    subtotal = Decimal("0")
    farmers_in_cart = set()

    for item in cart_items:
        product = item.product
        if not product or product.status == "INACTIVE":
            continue

        item_subtotal = product.price * item.quantity
        subtotal += item_subtotal
        farmers_in_cart.add(str(product.farmer_id))

        primary_image = None
        for img in product.images:
            if img.is_primary:
                primary_image = img.image_url
                break
        if not primary_image and product.images:
            primary_image = product.images[0].image_url

        items.append({
            "id": item.id,
            "product_id": product.id,
            "product_name_en": product.name_en,
            "product_name_mr": product.name_mr,
            "product_price": product.price,
            "product_unit": product.unit,
            "product_stock": product.stock,
            "product_min_order_qty": product.min_order_qty,
            "farmer_name": product.farmer.name if product.farmer else None,
            "primary_image": primary_image,
            "quantity": item.quantity,
            "subtotal": item_subtotal,
            "added_at": item.added_at,
        })

    cs = await _load_commerce_settings(db)

    cart_discount = (subtotal * cs["cart_discount_percent"] / 100).quantize(Decimal("1"))
    discounted = subtotal - cart_discount

    delivery_charge = Decimal("0")
    if discounted < cs["free_delivery_threshold"]:
        delivery_charge = cs["delivery_charge"] * len(farmers_in_cart)

    gst = (discounted * cs["gst_percent"] / 100).quantize(Decimal("1"))
    total = discounted + delivery_charge + gst

    return {
        "items": items,
        "subtotal": subtotal,
        "cart_discount": cart_discount,
        "delivery_charge": delivery_charge,
        "gst": gst,
        "discount": cart_discount,
        "total": total,
        "min_order_value": cs["min_order_value"],
        "promo_code": None,
    }


async def remove_from_cart(
    user_id: uuid.UUID,
    product_id: uuid.UUID,
    db: AsyncSession,
) -> bool:
    """Remove item from cart."""
    result = await db.execute(
        select(Cart).where(Cart.user_id == user_id, Cart.product_id == product_id)
    )
    cart_item = result.scalar_one_or_none()
    if not cart_item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not in cart")

    await db.delete(cart_item)
    await db.flush()
    return True


async def update_cart_quantity(
    user_id: uuid.UUID,
    product_id: uuid.UUID,
    quantity: int,
    db: AsyncSession,
) -> Cart:
    """Update cart item quantity."""
    result = await db.execute(
        select(Cart)
        .options(selectinload(Cart.product))
        .where(Cart.user_id == user_id, Cart.product_id == product_id)
    )
    cart_item = result.scalar_one_or_none()
    if not cart_item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not in cart")

    if quantity < 1:
        await db.delete(cart_item)
        await db.flush()
        return None

    if quantity > cart_item.product.stock:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Only {cart_item.product.stock} units available",
        )

    cart_item.quantity = quantity
    await db.flush()
    await db.refresh(cart_item)
    return cart_item


async def apply_promo(
    user_id: uuid.UUID,
    code: str,
    db: AsyncSession,
) -> Dict[str, Any]:
    """Validate and apply promo code, return discount info."""
    code = code.upper().strip()

    result = await db.execute(
        select(PromoCode).where(PromoCode.code == code, PromoCode.is_active == True)
    )
    promo = result.scalar_one_or_none()

    if not promo:
        return {"valid": False, "discount_amount": Decimal("0"), "message": "Invalid promo code"}

    now = datetime.utcnow()
    if promo.expires_at and promo.expires_at < now:
        return {"valid": False, "discount_amount": Decimal("0"), "message": "Promo code has expired"}

    if promo.max_uses and promo.used_count >= promo.max_uses:
        return {"valid": False, "discount_amount": Decimal("0"), "message": "Promo code usage limit reached"}

    # Calculate discount on current cart
    cart = await get_cart(user_id, db)
    subtotal = cart["subtotal"]

    if subtotal < promo.min_order_amount:
        return {
            "valid": False,
            "discount_amount": Decimal("0"),
            "message": f"Minimum order amount of ₹{promo.min_order_amount} required",
        }

    if promo.discount_type == "PERCENT":
        discount = (subtotal * promo.discount_value / 100).quantize(Decimal("0.01"))
    else:
        discount = min(promo.discount_value, subtotal)

    return {
        "valid": True,
        "discount_amount": discount,
        "message": f"Promo applied! You save ₹{discount}",
    }


async def place_order(
    user_id: uuid.UUID,
    address_id: uuid.UUID,
    payment_method: str,
    promo_code: Optional[str],
    db: AsyncSession,
) -> Order:
    """Place an order from cart items, reduce stock, notify farmers."""
    # Validate address
    result = await db.execute(
        select(Address).where(Address.id == address_id, Address.user_id == user_id)
    )
    address = result.scalar_one_or_none()
    if not address:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Address not found")

    # Get cart
    cart_result = await db.execute(
        select(Cart)
        .options(selectinload(Cart.product))
        .where(Cart.user_id == user_id)
    )
    cart_items = cart_result.scalars().all()

    if not cart_items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cart is empty")

    # Validate stock and compute totals
    subtotal = Decimal("0")
    farmers_in_order = set()
    order_items_data = []

    for item in cart_items:
        product = item.product
        if not product or product.status == "INACTIVE":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Product {product.name_en if product else 'unknown'} is no longer available",
            )
        if product.stock < item.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient stock for {product.name_en}. Available: {product.stock}",
            )

        item_subtotal = product.price * item.quantity
        subtotal += item_subtotal
        farmers_in_order.add(product.farmer_id)
        order_items_data.append({
            "product": product,
            "quantity": item.quantity,
            "unit_price": product.price,
            "subtotal": item_subtotal,
        })

    # Delivery charge
    delivery_charge = Decimal("0")
    if subtotal < FREE_DELIVERY_THRESHOLD:
        delivery_charge = DELIVERY_CHARGE * len(farmers_in_order)

    # Apply promo
    discount_amount = Decimal("0")
    if promo_code:
        promo_result = await apply_promo(user_id, promo_code, db)
        if promo_result["valid"]:
            discount_amount = promo_result["discount_amount"]
            # Increment usage
            result = await db.execute(
                select(PromoCode).where(PromoCode.code == promo_code.upper())
            )
            promo = result.scalar_one_or_none()
            if promo:
                promo.used_count += 1

    total_amount = subtotal + delivery_charge - discount_amount

    # Set payment status
    if payment_method == "COD":
        payment_status = "PENDING_COD"
    else:
        payment_status = "PENDING"

    # Create order
    order = Order(
        id=uuid.uuid4(),
        customer_id=user_id,
        address_id=address_id,
        status="PLACED",
        payment_method=payment_method,
        payment_status=payment_status,
        promo_code=promo_code,
        discount_amount=discount_amount,
        delivery_charge=delivery_charge,
        total_amount=total_amount,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(order)
    await db.flush()

    # Create order items and reduce stock
    for item_data in order_items_data:
        product = item_data["product"]

        order_item = OrderItem(
            id=uuid.uuid4(),
            order_id=order.id,
            product_id=product.id,
            farmer_id=product.farmer_id,
            quantity=item_data["quantity"],
            unit_price=item_data["unit_price"],
            subtotal=item_data["subtotal"],
        )
        db.add(order_item)

        # Reduce stock
        product.stock -= item_data["quantity"]
        if product.stock == 0:
            product.status = "OUT_OF_STOCK"
        product.updated_at = datetime.utcnow()

        # Notify farmer
        await create_notification(
            db,
            product.farmer_id,
            "NEW_ORDER",
            "New Order Received",
            f"You have a new order for {product.name_en} x{item_data['quantity']}",
            {"order_id": str(order.id), "product_id": str(product.id)},
        )

    # Clear cart
    for item in cart_items:
        await db.delete(item)

    await db.flush()
    await db.refresh(order)
    return order


async def create_razorpay_order(
    amount_paise: int,
    order_id: uuid.UUID,
    razorpay_client: razorpay.Client,
) -> Dict[str, Any]:
    """Create Razorpay order for payment initiation."""
    try:
        rz_order = razorpay_client.order.create({
            "amount": amount_paise,
            "currency": "INR",
            "receipt": str(order_id),
            "notes": {"order_id": str(order_id)},
        })
        return rz_order
    except Exception as e:
        logger.error(f"Razorpay order creation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create payment order",
        )


async def verify_payment(
    order_id: uuid.UUID,
    razorpay_order_id: str,
    razorpay_payment_id: str,
    razorpay_signature: str,
    db: AsyncSession,
) -> Order:
    """Verify Razorpay payment signature and update order payment status."""
    # HMAC SHA256 verification
    msg = f"{razorpay_order_id}|{razorpay_payment_id}"
    expected_signature = hmac.new(
        settings.RAZORPAY_KEY_SECRET.encode("utf-8"),
        msg.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(expected_signature, razorpay_signature):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid payment signature",
        )

    result = await db.execute(
        select(Order).where(Order.id == order_id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    order.razorpay_order_id = razorpay_order_id
    order.razorpay_payment_id = razorpay_payment_id
    order.payment_status = "CONFIRMED"
    order.updated_at = datetime.utcnow()

    await db.flush()

    # Notify customer
    await create_notification(
        db,
        order.customer_id,
        "PAYMENT_CONFIRMED",
        "Payment Confirmed",
        f"Payment of ₹{order.total_amount} for order #{str(order.id)[:8].upper()} confirmed!",
        {"order_id": str(order.id)},
    )

    await db.refresh(order)
    return order


async def cancel_order(
    order_id: uuid.UUID,
    user_id: uuid.UUID,
    reason: Optional[str],
    db: AsyncSession,
) -> Order:
    """Cancel order within 1 hour window."""
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.items).selectinload(OrderItem.product))
        .where(Order.id == order_id, Order.customer_id == user_id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    if order.status not in ("PLACED", "CONFIRMED"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Order cannot be cancelled at this stage",
        )

    # 1-hour cancellation window
    cancellation_window = timedelta(hours=1)
    if datetime.utcnow() - order.created_at > cancellation_window:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cancellation window (1 hour) has expired",
        )

    order.status = "CANCELLED_BY_CUSTOMER"
    order.cancelled_reason = reason
    order.updated_at = datetime.utcnow()

    # Restore stock
    for item in order.items:
        if item.product:
            item.product.stock += item.quantity
            if item.product.status == "OUT_OF_STOCK":
                item.product.status = "ACTIVE"
            item.product.updated_at = datetime.utcnow()

    await db.flush()
    await db.refresh(order)
    return order


async def get_order_history(
    user_id: uuid.UUID,
    db: AsyncSession,
    status_filter: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
) -> Dict[str, Any]:
    """Get paginated order history for a customer."""
    stmt = (
        select(Order)
        .options(selectinload(Order.items).selectinload(OrderItem.product))
        .where(Order.customer_id == user_id)
    )

    if status_filter:
        stmt = stmt.where(Order.status == status_filter)

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total_result = await db.execute(count_stmt)
    total = total_result.scalar() or 0

    stmt = stmt.order_by(Order.created_at.desc())
    offset = (page - 1) * page_size
    stmt = stmt.offset(offset).limit(page_size)

    result = await db.execute(stmt)
    orders = result.scalars().all()

    return {
        "items": orders,
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": (total + page_size - 1) // page_size,
    }


async def get_order_detail(
    order_id: uuid.UUID,
    user_id: uuid.UUID,
    db: AsyncSession,
) -> Order:
    """Get full order detail for a customer."""
    result = await db.execute(
        select(Order)
        .options(
            selectinload(Order.items).selectinload(OrderItem.product).selectinload(Product.images),
            selectinload(Order.address),
        )
        .where(Order.id == order_id, Order.customer_id == user_id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return order
