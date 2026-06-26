import uuid
from typing import Optional

from fastapi import APIRouter, Depends, UploadFile, File, Form, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.schemas.review import ReviewCreate
from app.services import review_service
from app.utils.s3 import upload_file_to_s3

router = APIRouter(prefix="/reviews", tags=["Reviews"])


@router.post("/", status_code=201, summary="Submit a product review")
async def submit_review(
    product_id: uuid.UUID = Form(...),
    order_id: uuid.UUID = Form(...),
    rating: int = Form(..., ge=1, le=5),
    comment: Optional[str] = Form(None),
    photo: Optional[UploadFile] = File(None),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Submit a review for a product.
    Requires the customer to have a delivered order containing the product.
    """
    review_data = ReviewCreate(
        product_id=product_id,
        order_id=order_id,
        rating=rating,
        comment=comment,
    )

    photo_url = None
    if photo and photo.filename:
        content = await photo.read()
        photo_url = await upload_file_to_s3(content, photo.filename, photo.content_type, "reviews")

    review = await review_service.submit_review(
        current_user.id, review_data, db, photo_url
    )

    return {
        "message": "Review submitted successfully",
        "review_id": str(review.id),
        "rating": review.rating,
    }


@router.get("/product/{product_id}", summary="Get product reviews")
async def get_product_reviews(
    product_id: uuid.UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Get paginated reviews for a product."""
    result = await review_service.get_product_reviews(product_id, db, page, page_size)
    return {
        "items": [
            {
                "id": str(r.id),
                "rating": r.rating,
                "comment": r.comment,
                "photo_url": r.photo_url,
                "customer_name": r.customer.name if r.customer else "Anonymous",
                "created_at": r.created_at.isoformat(),
            }
            for r in result["items"]
        ],
        "total": result["total"],
        "page": result["page"],
        "pages": result["pages"],
        "avg_rating": result["avg_rating"],
    }
