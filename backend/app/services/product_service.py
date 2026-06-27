import uuid
import logging
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any, Tuple

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, desc, text
from sqlalchemy.orm import selectinload

from app.models.product import Product, ProductImage, Category, FarmerProductListing
from app.models.order import Order, OrderItem
from app.models.user import User, FarmerProfile
from app.models.review import Review
from app.schemas.product import SearchParams

logger = logging.getLogger(__name__)


async def search_products(
    params: SearchParams,
    db: AsyncSession,
) -> Tuple[List[Product], int]:
    """Full product search with filters, transliteration, and pagination."""
    from app.utils.search import build_search_query

    products, total = await build_search_query(
        q=params.q,
        session=db,
        category_id=params.category_id,
        farmer_id=params.farmer_id,
        min_price=params.min_price,
        max_price=params.max_price,
        is_organic=params.is_organic,
        unit=params.unit,
        in_stock=params.in_stock,
        sort_by=params.sort_by,
        sort_order=params.sort_order,
        page=params.page,
        page_size=params.page_size,
    )
    return products, total


async def get_product_detail(
    product_id: uuid.UUID,
    db: AsyncSession,
) -> Optional[Product]:
    """Get product with images, farmer info, and avg rating."""
    result = await db.execute(
        select(Product)
        .options(
            selectinload(Product.images),
            selectinload(Product.farmer).selectinload(User.farmer_profile),
            selectinload(Product.category),
            selectinload(Product.reviews),
            selectinload(Product.discount),
            selectinload(Product.farmer_listings).selectinload(
                FarmerProductListing.farmer
            ).selectinload(User.farmer_profile),
        )
        .where(Product.id == product_id, Product.status != "INACTIVE")
    )
    return result.scalar_one_or_none()


async def get_similar_products(
    product_id: uuid.UUID,
    db: AsyncSession,
    limit: int = 8,
) -> List[Product]:
    """Get similar products: same category, similar tags, exclude current."""
    # Get the product first
    result = await db.execute(
        select(Product).where(Product.id == product_id)
    )
    product = result.scalar_one_or_none()
    if not product:
        return []

    stmt = (
        select(Product)
        .options(selectinload(Product.images))
        .where(
            Product.category_id == product.category_id,
            Product.id != product_id,
            Product.status == "ACTIVE",
            Product.stock > 0,
        )
        .order_by(func.random())
        .limit(limit)
    )

    result = await db.execute(stmt)
    return result.scalars().all()


async def get_trending_products(
    db: AsyncSession,
    limit: int = 10,
) -> List[Dict[str, Any]]:
    """Get trending products by order volume in last 7 days."""
    seven_days_ago = datetime.utcnow() - timedelta(days=7)

    stmt = (
        select(
            Product,
            func.sum(OrderItem.quantity).label("total_sold"),
        )
        .join(OrderItem, OrderItem.product_id == Product.id)
        .join(Order, Order.id == OrderItem.order_id)
        .options(selectinload(Product.images))
        .where(
            Order.created_at >= seven_days_ago,
            Order.status.notin_(["CANCELLED_BY_CUSTOMER", "CANCELLED_BY_FARMER", "CANCELLED_BY_ADMIN"]),
            Product.status == "ACTIVE",
            Product.stock > 0,
        )
        .group_by(Product.id)
        .order_by(desc("total_sold"))
        .limit(limit)
    )

    result = await db.execute(stmt)
    rows = result.all()

    trending = []
    for product, total_sold in rows:
        trending.append({"product": product, "total_sold": total_sold})
    return trending


async def get_today_picks(
    db: AsyncSession,
    limit: int = 20,
) -> List[Product]:
    """Get products harvested today or newly listed today."""
    today = datetime.utcnow().date()
    today_start = datetime.combine(today, datetime.min.time())

    stmt = (
        select(Product)
        .options(selectinload(Product.images), selectinload(Product.farmer))
        .where(
            and_(
                Product.status == "ACTIVE",
                Product.stock > 0,
                (Product.harvest_date == today) | (Product.created_at >= today_start),
            )
        )
        .order_by(Product.created_at.desc())
        .limit(limit)
    )

    result = await db.execute(stmt)
    return result.scalars().all()


async def get_farmers_near_customer(
    pin_code: str,
    db: AsyncSession,
    limit: int = 20,
) -> List[FarmerProfile]:
    """Get farmers in the same district based on PIN code proximity."""
    # In a real system, we'd use a PIN code → district lookup table
    # For now, we return approved farmers ordered by rating
    # A real implementation would use PostGIS or a PIN code database

    stmt = (
        select(FarmerProfile)
        .join(User, FarmerProfile.user_id == User.id)
        .options(selectinload(FarmerProfile.user))
        .where(
            FarmerProfile.status == "APPROVED",
            User.is_active == True,
        )
        .order_by(FarmerProfile.rating.desc())
        .limit(limit)
    )

    result = await db.execute(stmt)
    return result.scalars().all()


async def get_all_categories(db: AsyncSession) -> List[Category]:
    """Get all active categories."""
    result = await db.execute(
        select(Category).where(Category.is_active == True).order_by(Category.name_en)
    )
    return result.scalars().all()


async def get_product_avg_rating(product_id: uuid.UUID, db: AsyncSession) -> float:
    """Get average rating for a product."""
    result = await db.execute(
        select(func.avg(Review.rating)).where(Review.product_id == product_id)
    )
    avg = result.scalar()
    return round(float(avg), 1) if avg else 0.0
