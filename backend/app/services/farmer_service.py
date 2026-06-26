import uuid
import logging
from datetime import datetime, timedelta
from decimal import Decimal
from typing import List, Optional, Dict, Any

from fastapi import HTTPException, status, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, update
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.models.product import Product, ProductImage, Category
from app.models.order import Order, OrderItem
from app.models.user import User, FarmerProfile
from app.schemas.product import ProductCreate, ProductUpdate
from app.utils.s3 import upload_file_to_s3, delete_file_from_s3
from app.utils.notifications import create_notification

logger = logging.getLogger(__name__)


async def get_farmer_products(
    farmer_id: uuid.UUID,
    db: AsyncSession,
    include_inactive: bool = False,
) -> List[Product]:
    """Get all products for a farmer."""
    stmt = (
        select(Product)
        .options(selectinload(Product.images), selectinload(Product.category))
        .where(Product.farmer_id == farmer_id)
    )
    if not include_inactive:
        stmt = stmt.where(Product.status != "INACTIVE")
    stmt = stmt.order_by(Product.created_at.desc())

    result = await db.execute(stmt)
    return result.scalars().all()


async def add_product(
    farmer_id: uuid.UUID,
    data: ProductCreate,
    db: AsyncSession,
    images: Optional[List[UploadFile]] = None,
) -> Product:
    """Create a new product for a farmer."""
    # Verify farmer is approved
    result = await db.execute(
        select(FarmerProfile).where(FarmerProfile.user_id == farmer_id)
    )
    profile = result.scalar_one_or_none()
    if not profile or profile.status != "APPROVED":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only approved farmers can add products",
        )

    # Verify category exists
    result = await db.execute(
        select(Category).where(Category.id == data.category_id, Category.is_active == True)
    )
    category = result.scalar_one_or_none()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found",
        )

    product = Product(
        id=uuid.uuid4(),
        farmer_id=farmer_id,
        category_id=data.category_id,
        name_en=data.name_en,
        name_mr=data.name_mr,
        description_en=data.description_en,
        description_mr=data.description_mr,
        price=data.price,
        unit=data.unit,
        min_order_qty=data.min_order_qty,
        stock=data.stock,
        is_organic=data.is_organic,
        harvest_date=data.harvest_date,
        best_before_date=data.best_before_date,
        tags=data.tags,
        status="ACTIVE" if data.stock > 0 else "OUT_OF_STOCK",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(product)
    await db.flush()

    # Upload images
    if images:
        for idx, image in enumerate(images):
            if image.filename:
                content = await image.read()
                url = await upload_file_to_s3(content, image.filename, image.content_type, "products")
                product_image = ProductImage(
                    id=uuid.uuid4(),
                    product_id=product.id,
                    image_url=url,
                    is_primary=(idx == 0),
                    display_order=idx,
                )
                db.add(product_image)

    await db.flush()
    await db.refresh(product)
    return product


async def update_product(
    product_id: uuid.UUID,
    farmer_id: uuid.UUID,
    data: ProductUpdate,
    db: AsyncSession,
) -> Product:
    """Update a product (farmer can only update their own products)."""
    result = await db.execute(
        select(Product)
        .options(selectinload(Product.images))
        .where(Product.id == product_id, Product.farmer_id == farmer_id)
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(product, field, value)

    # Auto-update status based on stock
    if "stock" in update_data:
        if update_data["stock"] == 0 and product.status == "ACTIVE":
            product.status = "OUT_OF_STOCK"
        elif update_data["stock"] > 0 and product.status == "OUT_OF_STOCK":
            product.status = "ACTIVE"

    product.updated_at = datetime.utcnow()
    await db.flush()
    await db.refresh(product)
    return product


async def delete_product(
    product_id: uuid.UUID,
    farmer_id: uuid.UUID,
    db: AsyncSession,
) -> bool:
    """Soft delete a product by setting status to INACTIVE."""
    result = await db.execute(
        select(Product).where(Product.id == product_id, Product.farmer_id == farmer_id)
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    product.status = "INACTIVE"
    product.updated_at = datetime.utcnow()
    await db.flush()
    return True


async def update_stock(
    product_id: uuid.UUID,
    farmer_id: uuid.UUID,
    stock: int,
    db: AsyncSession,
) -> Product:
    """Quick stock update for a product."""
    result = await db.execute(
        select(Product).where(Product.id == product_id, Product.farmer_id == farmer_id)
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    product.stock = stock
    if stock == 0:
        product.status = "OUT_OF_STOCK"
    elif product.status == "OUT_OF_STOCK":
        product.status = "ACTIVE"

    product.updated_at = datetime.utcnow()
    await db.flush()
    await db.refresh(product)
    return product


async def get_farmer_dashboard(farmer_id: uuid.UUID, db: AsyncSession) -> Dict[str, Any]:
    """Get dashboard statistics for a farmer."""
    today = datetime.utcnow().date()
    today_start = datetime.combine(today, datetime.min.time())
    today_end = datetime.combine(today, datetime.max.time())

    # Today's orders
    result = await db.execute(
        select(func.count(Order.id)).where(
            OrderItem.farmer_id == farmer_id,
            Order.id == OrderItem.order_id,
            Order.created_at.between(today_start, today_end),
            Order.status.notin_(["CANCELLED_BY_CUSTOMER", "CANCELLED_BY_FARMER", "CANCELLED_BY_ADMIN"]),
        )
    )
    today_orders = result.scalar() or 0

    # Pending orders
    result = await db.execute(
        select(func.count(Order.id.distinct())).where(
            OrderItem.farmer_id == farmer_id,
            Order.id == OrderItem.order_id,
            Order.status.in_(["PLACED", "CONFIRMED", "PACKED"]),
        )
    )
    pending_orders = result.scalar() or 0

    # Total earnings (net after commission)
    result = await db.execute(
        select(func.sum(OrderItem.subtotal)).where(
            OrderItem.farmer_id == farmer_id,
            Order.id == OrderItem.order_id,
            Order.status.in_(["DELIVERED", "COMPLETED"]),
            Order.payment_status.in_(["CONFIRMED", "PENDING_COD"]),
        )
    )
    gross_earnings = result.scalar() or Decimal("0")
    commission = gross_earnings * Decimal(str(settings.PLATFORM_COMMISSION_PERCENT / 100))
    net_earnings = gross_earnings - commission

    # Low stock products (stock < 5)
    result = await db.execute(
        select(Product).where(
            Product.farmer_id == farmer_id,
            Product.stock < 5,
            Product.status == "ACTIVE",
        )
    )
    low_stock_products = result.scalars().all()

    return {
        "today_orders": today_orders,
        "pending_orders": pending_orders,
        "gross_earnings": float(gross_earnings),
        "commission_deducted": float(commission),
        "net_earnings": float(net_earnings),
        "low_stock_alerts": [
            {"id": str(p.id), "name": p.name_en, "stock": p.stock} for p in low_stock_products
        ],
    }


async def get_farmer_earnings(farmer_id: uuid.UUID, db: AsyncSession) -> Dict[str, Any]:
    """Get detailed earnings breakdown for a farmer."""
    # Total gross earnings from completed orders
    result = await db.execute(
        select(func.sum(OrderItem.subtotal)).where(
            OrderItem.farmer_id == farmer_id,
            Order.id == OrderItem.order_id,
            Order.status.in_(["DELIVERED", "COMPLETED"]),
            Order.payment_status.in_(["CONFIRMED", "PENDING_COD"]),
        )
    )
    gross = result.scalar() or Decimal("0")

    commission_rate = Decimal(str(settings.PLATFORM_COMMISSION_PERCENT / 100))
    commission = gross * commission_rate
    net = gross - commission

    # Monthly breakdown (last 6 months)
    monthly_data = []
    for i in range(6):
        month_start = (datetime.utcnow().replace(day=1) - timedelta(days=i * 30)).replace(day=1)
        month_end = (month_start + timedelta(days=32)).replace(day=1) - timedelta(days=1)

        result = await db.execute(
            select(func.sum(OrderItem.subtotal)).where(
                OrderItem.farmer_id == farmer_id,
                Order.id == OrderItem.order_id,
                Order.status.in_(["DELIVERED", "COMPLETED"]),
                Order.created_at.between(month_start, month_end),
            )
        )
        month_gross = result.scalar() or Decimal("0")
        monthly_data.append({
            "month": month_start.strftime("%B %Y"),
            "gross": float(month_gross),
            "commission": float(month_gross * commission_rate),
            "net": float(month_gross * (1 - commission_rate)),
        })

    return {
        "gross_earnings": float(gross),
        "commission_percent": settings.PLATFORM_COMMISSION_PERCENT,
        "commission_deducted": float(commission),
        "net_payouts": float(net),
        "monthly_breakdown": monthly_data,
    }


async def get_farmer_orders(
    farmer_id: uuid.UUID,
    db: AsyncSession,
    status_filter: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
) -> Dict[str, Any]:
    """Get orders assigned to a farmer's products."""
    stmt = (
        select(Order)
        .join(OrderItem, Order.id == OrderItem.order_id)
        .options(selectinload(Order.items), selectinload(Order.customer))
        .where(OrderItem.farmer_id == farmer_id)
        .distinct()
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


async def update_order_status(
    order_id: uuid.UUID,
    farmer_id: uuid.UUID,
    new_status: str,
    tracking_number: Optional[str],
    carrier_name: Optional[str],
    db: AsyncSession,
) -> Order:
    """Update order status for farmer's orders."""
    # Verify farmer has items in this order
    result = await db.execute(
        select(OrderItem).where(
            OrderItem.order_id == order_id,
            OrderItem.farmer_id == farmer_id,
        )
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found or unauthorized",
        )

    result = await db.execute(
        select(Order)
        .options(selectinload(Order.items), selectinload(Order.customer))
        .where(Order.id == order_id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    # Validate status transition
    valid_transitions = {
        "PLACED": ["CONFIRMED", "CANCELLED_BY_FARMER"],
        "CONFIRMED": ["PACKED", "CANCELLED_BY_FARMER"],
        "PACKED": ["DISPATCHED"],
        "DISPATCHED": ["DELIVERED"],
        "DELIVERED": ["COMPLETED"],
    }

    allowed = valid_transitions.get(order.status, [])
    if new_status not in allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot transition from {order.status} to {new_status}",
        )

    order.status = new_status
    if tracking_number:
        order.tracking_number = tracking_number
    if carrier_name:
        order.carrier_name = carrier_name
    order.updated_at = datetime.utcnow()

    await db.flush()

    # Notify customer
    status_messages = {
        "CONFIRMED": "Your order has been confirmed by the farmer.",
        "PACKED": "Your order is packed and ready for dispatch.",
        "DISPATCHED": "Your order is on the way!",
        "DELIVERED": "Your order has been delivered.",
        "CANCELLED_BY_FARMER": "Your order was cancelled by the farmer.",
    }

    msg = status_messages.get(new_status, f"Order status updated to {new_status}")
    await create_notification(
        db,
        order.customer_id,
        "ORDER_STATUS_UPDATE",
        f"Order #{str(order.id)[:8].upper()} Update",
        msg,
        {"order_id": str(order.id), "status": new_status},
    )

    await db.refresh(order)
    return order
