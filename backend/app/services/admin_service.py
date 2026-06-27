import uuid
import logging
from datetime import datetime, timedelta
from decimal import Decimal
from typing import List, Optional, Dict, Any

import razorpay
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, update, desc
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.models.product import Product, Category
from app.models.order import Order, OrderItem
from app.models.user import User, FarmerProfile
from app.utils.notifications import create_notification

logger = logging.getLogger(__name__)


async def get_dashboard_stats(db: AsyncSession) -> Dict[str, Any]:
    """Get platform-wide dashboard statistics."""
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # User counts
    result = await db.execute(select(func.count(User.id)).where(User.role == "farmer"))
    total_farmers = result.scalar() or 0

    result = await db.execute(select(func.count(User.id)).where(User.role == "customer"))
    total_customers = result.scalar() or 0

    result = await db.execute(
        select(func.count(FarmerProfile.id)).where(FarmerProfile.status == "PENDING")
    )
    pending_farmers = result.scalar() or 0

    result = await db.execute(
        select(func.count(FarmerProfile.id)).where(FarmerProfile.status == "APPROVED")
    )
    approved_farmers = result.scalar() or 0

    result = await db.execute(
        select(func.count(FarmerProfile.id)).where(FarmerProfile.status == "REJECTED")
    )
    rejected_farmers = result.scalar() or 0

    result = await db.execute(select(func.count(Product.id)).where(Product.status == "ACTIVE"))
    total_products = result.scalar() or 0

    result = await db.execute(
        select(func.count(Product.id)).where(Product.stock < 5, Product.status == "ACTIVE")
    )
    low_stock_count = result.scalar() or 0

    # Orders today
    result = await db.execute(
        select(func.count(Order.id)).where(Order.created_at >= today_start)
    )
    orders_today = result.scalar() or 0

    result = await db.execute(select(func.count(Order.id)))
    total_orders = result.scalar() or 0

    # Total revenue (all time, confirmed orders)
    result = await db.execute(
        select(func.sum(Order.total_amount)).where(
            Order.payment_status.in_(["CONFIRMED", "PENDING_COD"])
        )
    )
    total_revenue = float(result.scalar() or Decimal("0"))

    # Revenue today
    result = await db.execute(
        select(func.sum(Order.total_amount)).where(
            Order.created_at >= today_start,
            Order.payment_status.in_(["CONFIRMED", "PENDING_COD"]),
        )
    )
    revenue_today = float(result.scalar() or Decimal("0"))

    # Revenue this month
    result = await db.execute(
        select(func.sum(Order.total_amount)).where(
            Order.created_at >= month_start,
            Order.payment_status.in_(["CONFIRMED", "PENDING_COD"]),
        )
    )
    revenue_this_month = float(result.scalar() or Decimal("0"))

    # Top products (by units sold) with category
    top_result = await db.execute(
        select(
            Product.id,
            Product.name_en,
            Category.slug.label("category"),
            func.sum(OrderItem.quantity).label("sold"),
        )
        .join(OrderItem, OrderItem.product_id == Product.id)
        .join(Category, Category.id == Product.category_id)
        .group_by(Product.id, Product.name_en, Category.slug)
        .order_by(desc("sold"))
        .limit(5)
    )
    top_products = [
        {
            "id": str(row.id),
            "name_en": row.name_en,
            "category": row.category,
            "total_ratings": int(row.sold),
        }
        for row in top_result.all()
    ]

    # Recent orders
    recent_result = await db.execute(
        select(Order)
        .options(selectinload(Order.customer))
        .order_by(Order.created_at.desc())
        .limit(10)
    )
    recent_orders = recent_result.scalars().all()

    return {
        "total_farmers": total_farmers,
        "pending_farmers": pending_farmers,
        "approved_farmers": approved_farmers,
        "rejected_farmers": rejected_farmers,
        "total_customers": total_customers,
        "total_products": total_products,
        "low_stock_count": low_stock_count,
        "orders_today": orders_today,
        "total_orders": total_orders,
        "total_revenue": total_revenue,
        "revenue_today": revenue_today,
        "revenue_this_month": revenue_this_month,
        "top_products": top_products,
        "recent_orders": [
            {
                "id": str(o.id),
                "customer": o.customer.name if o.customer else "Unknown",
                "amount": float(o.total_amount),
                "status": o.status,
                "created_at": o.created_at.isoformat(),
            }
            for o in recent_orders
        ],
    }


async def list_farmers(
    db: AsyncSession,
    status_filter: Optional[str] = None,
    district: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
) -> Dict[str, Any]:
    """List farmers with optional filters."""
    stmt = (
        select(User)
        .options(selectinload(User.farmer_profile))
        .join(FarmerProfile, FarmerProfile.user_id == User.id)
        .where(User.role == "farmer")
    )

    if status_filter:
        stmt = stmt.where(FarmerProfile.status == status_filter)

    if district:
        stmt = stmt.where(FarmerProfile.district.ilike(f"%{district}%"))

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total_result = await db.execute(count_stmt)
    total = total_result.scalar() or 0

    offset = (page - 1) * page_size
    stmt = stmt.order_by(User.created_at.desc()).offset(offset).limit(page_size)

    result = await db.execute(stmt)
    farmers = result.scalars().all()

    return {
        "items": farmers,
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": (total + page_size - 1) // page_size,
    }


async def approve_farmer(
    farmer_id: uuid.UUID,
    admin_id: uuid.UUID,
    db: AsyncSession,
) -> FarmerProfile:
    """Approve a pending farmer."""
    result = await db.execute(
        select(FarmerProfile).where(FarmerProfile.user_id == farmer_id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Farmer profile not found")

    if profile.status != "PENDING":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Farmer is already in {profile.status} status",
        )

    profile.status = "APPROVED"
    profile.approved_at = datetime.utcnow()
    profile.updated_at = datetime.utcnow()
    await db.flush()

    await create_notification(
        db,
        farmer_id,
        "FARMER_APPROVED",
        "Application Approved!",
        "Congratulations! Your farmer account has been approved. You can now start listing products.",
        {"status": "APPROVED"},
    )

    await db.refresh(profile)
    return profile


async def reject_farmer(
    farmer_id: uuid.UUID,
    reason: str,
    admin_id: uuid.UUID,
    db: AsyncSession,
) -> FarmerProfile:
    """Reject a pending farmer with reason."""
    result = await db.execute(
        select(FarmerProfile).where(FarmerProfile.user_id == farmer_id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Farmer profile not found")

    profile.status = "REJECTED"
    profile.rejection_reason = reason
    profile.rejected_at = datetime.utcnow()
    profile.updated_at = datetime.utcnow()
    await db.flush()

    await create_notification(
        db,
        farmer_id,
        "FARMER_REJECTED",
        "Application Rejected",
        f"Your farmer application was not approved. Reason: {reason}",
        {"status": "REJECTED", "reason": reason},
    )

    await db.refresh(profile)
    return profile


async def suspend_farmer(
    farmer_id: uuid.UUID,
    db: AsyncSession,
) -> FarmerProfile:
    """Suspend a farmer and deactivate all their products."""
    result = await db.execute(
        select(FarmerProfile).where(FarmerProfile.user_id == farmer_id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Farmer profile not found")

    profile.status = "SUSPENDED"
    profile.updated_at = datetime.utcnow()

    # Deactivate all active products
    result = await db.execute(
        select(Product).where(Product.farmer_id == farmer_id, Product.status == "ACTIVE")
    )
    products = result.scalars().all()
    for product in products:
        product.status = "INACTIVE"
        product.updated_at = datetime.utcnow()

    await db.flush()

    await create_notification(
        db,
        farmer_id,
        "FARMER_SUSPENDED",
        "Account Suspended",
        "Your farmer account has been suspended. Please contact support for details.",
        {"status": "SUSPENDED"},
    )

    await db.refresh(profile)
    return profile


async def get_farmer_inventory(
    farmer_id: uuid.UUID,
    db: AsyncSession,
) -> List[Product]:
    """Get all products for a farmer (admin view, includes all statuses).
    Includes both direct farmer_id products and farmer_product_listings products.
    """
    from app.models.product import FarmerProductListing
    from sqlalchemy import or_

    # Get product IDs from farmer_product_listings
    listing_result = await db.execute(
        select(FarmerProductListing.product_id)
        .where(FarmerProductListing.farmer_id == farmer_id)
    )
    listing_product_ids = [r[0] for r in listing_result.all()]

    result = await db.execute(
        select(Product)
        .options(selectinload(Product.images), selectinload(Product.category))
        .where(
            or_(
                Product.farmer_id == farmer_id,
                Product.id.in_(listing_product_ids) if listing_product_ids else False,
            )
        )
        .order_by(Product.created_at.desc())
    )
    return result.scalars().all()


async def admin_update_product(
    product_id: uuid.UUID,
    update_data: dict,
    reason: str,
    db: AsyncSession,
) -> Product:
    """Admin update product with reason logging."""
    result = await db.execute(
        select(Product).options(selectinload(Product.images)).where(Product.id == product_id)
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    old_values = {}
    for field, value in update_data.items():
        if hasattr(product, field):
            old_values[field] = getattr(product, field)
            setattr(product, field, value)

    product.updated_at = datetime.utcnow()
    await db.flush()

    logger.info(
        f"Admin updated product {product_id}. Reason: {reason}. "
        f"Changes: {old_values} -> {update_data}"
    )

    # Notify farmer
    await create_notification(
        db,
        product.farmer_id,
        "PRODUCT_UPDATED_BY_ADMIN",
        "Product Updated by Admin",
        f"Your product '{product.name_en}' has been updated by admin. Reason: {reason}",
        {"product_id": str(product_id), "reason": reason},
    )

    await db.refresh(product)
    return product


async def get_all_orders(
    db: AsyncSession,
    status_filter: Optional[str] = None,
    payment_status: Optional[str] = None,
    farmer_id: Optional[uuid.UUID] = None,
    customer_id: Optional[uuid.UUID] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    page: int = 1,
    page_size: int = 20,
) -> Dict[str, Any]:
    """Get all orders with filters (admin view)."""
    stmt = (
        select(Order)
        .options(
            selectinload(Order.customer),
            selectinload(Order.items),
        )
    )

    if status_filter:
        stmt = stmt.where(Order.status == status_filter)

    if payment_status:
        stmt = stmt.where(Order.payment_status == payment_status)

    if customer_id:
        stmt = stmt.where(Order.customer_id == customer_id)

    if farmer_id:
        stmt = stmt.join(OrderItem, Order.id == OrderItem.order_id).where(
            OrderItem.farmer_id == farmer_id
        )

    if date_from:
        stmt = stmt.where(Order.created_at >= date_from)

    if date_to:
        stmt = stmt.where(Order.created_at <= date_to)

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total_result = await db.execute(count_stmt)
    total = total_result.scalar() or 0

    offset = (page - 1) * page_size
    stmt = stmt.order_by(Order.created_at.desc()).offset(offset).limit(page_size)

    result = await db.execute(stmt)
    orders = result.scalars().all()

    return {
        "items": orders,
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": (total + page_size - 1) // page_size,
    }


async def issue_refund(
    order_id: uuid.UUID,
    db: AsyncSession,
    razorpay_client: razorpay.Client,
) -> Dict[str, Any]:
    """Issue a refund via Razorpay API."""
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    if not order.razorpay_payment_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No Razorpay payment found for this order",
        )

    if order.payment_status == "REFUNDED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Order has already been refunded",
        )

    try:
        amount_paise = int(order.total_amount * 100)
        refund = razorpay_client.payment.refund(
            order.razorpay_payment_id,
            {"amount": amount_paise, "notes": {"order_id": str(order_id)}},
        )

        order.payment_status = "REFUNDED"
        order.updated_at = datetime.utcnow()
        await db.flush()

        await create_notification(
            db,
            order.customer_id,
            "REFUND_ISSUED",
            "Refund Issued",
            f"A refund of ₹{order.total_amount} has been initiated for order #{str(order.id)[:8].upper()}.",
            {"order_id": str(order.id), "refund_id": refund.get("id")},
        )

        return {"success": True, "refund_id": refund.get("id"), "amount": float(order.total_amount)}

    except Exception as e:
        logger.error(f"Razorpay refund failed for order {order_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Refund failed. Please try again.",
        )


async def get_analytics(
    period: str,
    db: AsyncSession,
) -> Dict[str, Any]:
    """Get platform analytics for a given period (day/week/month/year)."""
    period_map = {
        "day": timedelta(days=1),
        "week": timedelta(weeks=1),
        "month": timedelta(days=30),
        "year": timedelta(days=365),
    }
    delta = period_map.get(period, timedelta(days=30))
    start_date = datetime.utcnow() - delta

    # Total revenue
    result = await db.execute(
        select(func.sum(Order.total_amount)).where(
            Order.created_at >= start_date,
            Order.payment_status.in_(["CONFIRMED", "PENDING_COD"]),
        )
    )
    total_revenue = result.scalar() or Decimal("0")

    # Total orders
    result = await db.execute(
        select(func.count(Order.id)).where(Order.created_at >= start_date)
    )
    total_orders = result.scalar() or 0

    # Revenue by category
    cat_result = await db.execute(
        select(
            Category.name_en,
            func.sum(OrderItem.subtotal).label("revenue"),
        )
        .join(Product, Product.category_id == Category.id)
        .join(OrderItem, OrderItem.product_id == Product.id)
        .join(Order, Order.id == OrderItem.order_id)
        .where(Order.created_at >= start_date)
        .group_by(Category.name_en)
        .order_by(desc("revenue"))
    )
    revenue_by_category = [
        {"category": row.name_en, "revenue": float(row.revenue)}
        for row in cat_result.all()
    ]

    # Revenue by district
    district_result = await db.execute(
        select(
            FarmerProfile.district,
            func.sum(OrderItem.subtotal).label("revenue"),
        )
        .join(User, User.id == FarmerProfile.user_id)
        .join(OrderItem, OrderItem.farmer_id == User.id)
        .join(Order, Order.id == OrderItem.order_id)
        .where(Order.created_at >= start_date)
        .group_by(FarmerProfile.district)
        .order_by(desc("revenue"))
    )
    revenue_by_district = [
        {"district": row.district, "revenue": float(row.revenue)}
        for row in district_result.all()
    ]

    # Top farmers by revenue
    farmer_result = await db.execute(
        select(
            User.name,
            FarmerProfile.district,
            func.sum(OrderItem.subtotal).label("revenue"),
        )
        .join(FarmerProfile, FarmerProfile.user_id == User.id)
        .join(OrderItem, OrderItem.farmer_id == User.id)
        .join(Order, Order.id == OrderItem.order_id)
        .where(Order.created_at >= start_date)
        .group_by(User.name, FarmerProfile.district)
        .order_by(desc("revenue"))
        .limit(10)
    )
    revenue_by_farmer = [
        {"farmer": row.name, "district": row.district, "revenue": float(row.revenue)}
        for row in farmer_result.all()
    ]

    # Orders by status
    status_result = await db.execute(
        select(Order.status, func.count(Order.id).label("count"))
        .where(Order.created_at >= start_date)
        .group_by(Order.status)
    )
    orders_by_status = {row.status: row.count for row in status_result.all()}

    # Top products
    top_result = await db.execute(
        select(Product.name_en, func.sum(OrderItem.quantity).label("sold"))
        .join(OrderItem, OrderItem.product_id == Product.id)
        .join(Order, Order.id == OrderItem.order_id)
        .where(Order.created_at >= start_date)
        .group_by(Product.name_en)
        .order_by(desc("sold"))
        .limit(10)
    )
    top_products = [
        {"product": row.name_en, "quantity_sold": int(row.sold)}
        for row in top_result.all()
    ]

    # Customer count
    result = await db.execute(
        select(func.count(User.id)).where(User.role == "customer", User.created_at >= start_date)
    )
    new_customers = result.scalar() or 0

    result = await db.execute(select(func.count(User.id)).where(User.role == "farmer"))
    total_farmers = result.scalar() or 0

    return {
        "period": period,
        "total_revenue": float(total_revenue),
        "total_orders": total_orders,
        "total_customers": new_customers,
        "total_farmers": total_farmers,
        "revenue_by_category": revenue_by_category,
        "revenue_by_farmer": revenue_by_farmer,
        "revenue_by_district": revenue_by_district,
        "orders_by_status": orders_by_status,
        "top_products": top_products,
    }
