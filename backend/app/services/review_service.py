import uuid
import logging
from datetime import datetime
from typing import Dict, Any, Optional, List

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload

from app.models.review import Review
from app.models.order import Order, OrderItem
from app.models.product import Product
from app.models.user import FarmerProfile
from app.schemas.review import ReviewCreate

logger = logging.getLogger(__name__)


async def submit_review(
    customer_id: uuid.UUID,
    data: ReviewCreate,
    db: AsyncSession,
    photo_url: Optional[str] = None,
) -> Review:
    """Submit a product review (customer must have a delivered order for this product)."""
    # Verify order exists, belongs to customer, and contains this product
    result = await db.execute(
        select(Order)
        .join(OrderItem, Order.id == OrderItem.order_id)
        .where(
            Order.id == data.order_id,
            Order.customer_id == customer_id,
            OrderItem.product_id == data.product_id,
            Order.status.in_(["DELIVERED", "COMPLETED"]),
        )
    )
    order = result.scalar_one_or_none()

    if not order:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You can only review products from delivered orders",
        )

    # Check if already reviewed
    result = await db.execute(
        select(Review).where(
            Review.customer_id == customer_id,
            Review.product_id == data.product_id,
            Review.order_id == data.order_id,
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You have already reviewed this product for this order",
        )

    review = Review(
        id=uuid.uuid4(),
        customer_id=customer_id,
        product_id=data.product_id,
        order_id=data.order_id,
        rating=data.rating,
        comment=data.comment,
        photo_url=photo_url,
        created_at=datetime.utcnow(),
    )
    db.add(review)
    await db.flush()

    # Recalculate farmer rating for the product's farmer
    result = await db.execute(
        select(Product).where(Product.id == data.product_id)
    )
    product = result.scalar_one_or_none()
    if product:
        await calculate_farmer_rating(product.farmer_id, db)

    await db.refresh(review)
    return review


async def calculate_farmer_rating(farmer_id: uuid.UUID, db: AsyncSession) -> float:
    """
    Calculate and update weighted average rating for a farmer.
    Uses all reviews for all products of the farmer.
    """
    result = await db.execute(
        select(func.avg(Review.rating), func.count(Review.id))
        .join(Product, Review.product_id == Product.id)
        .where(Product.farmer_id == farmer_id)
    )
    row = result.one()
    avg_rating = float(row[0]) if row[0] else 0.0
    total_ratings = int(row[1]) if row[1] else 0

    # Round to 1 decimal
    avg_rating = round(avg_rating, 1)

    # Update farmer profile
    result = await db.execute(
        select(FarmerProfile).where(FarmerProfile.user_id == farmer_id)
    )
    profile = result.scalar_one_or_none()
    if profile:
        profile.rating = avg_rating
        profile.total_ratings = total_ratings
        await db.flush()

    return avg_rating


async def get_product_reviews(
    product_id: uuid.UUID,
    db: AsyncSession,
    page: int = 1,
    page_size: int = 20,
) -> Dict[str, Any]:
    """Get paginated reviews for a product with aggregate stats."""
    stmt = (
        select(Review)
        .options(selectinload(Review.customer))
        .where(Review.product_id == product_id)
    )

    # Count
    count_result = await db.execute(
        select(func.count()).select_from(stmt.subquery())
    )
    total = count_result.scalar() or 0

    # Avg rating
    avg_result = await db.execute(
        select(func.avg(Review.rating)).where(Review.product_id == product_id)
    )
    avg_rating = float(avg_result.scalar() or 0)

    # Paginated results
    offset = (page - 1) * page_size
    stmt = stmt.order_by(Review.created_at.desc()).offset(offset).limit(page_size)

    result = await db.execute(stmt)
    reviews = result.scalars().all()

    return {
        "items": reviews,
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": (total + page_size - 1) // page_size,
        "avg_rating": round(avg_rating, 1),
    }
