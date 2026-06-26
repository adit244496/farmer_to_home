import uuid
from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, ConfigDict, field_validator


class ReviewCreate(BaseModel):
    product_id: uuid.UUID
    order_id: uuid.UUID
    rating: int
    comment: Optional[str] = None

    @field_validator("rating")
    @classmethod
    def validate_rating(cls, v: int) -> int:
        if v < 1 or v > 5:
            raise ValueError("Rating must be between 1 and 5")
        return v

    @field_validator("comment")
    @classmethod
    def validate_comment(cls, v: Optional[str]) -> Optional[str]:
        if v and len(v) > 300:
            raise ValueError("Comment must be at most 300 characters")
        return v


class ReviewerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: Optional[str] = None


class ReviewOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    customer_id: uuid.UUID
    product_id: uuid.UUID
    order_id: uuid.UUID
    rating: int
    comment: Optional[str] = None
    photo_url: Optional[str] = None
    created_at: datetime


class PaginatedReviewsOut(BaseModel):
    items: List[ReviewOut]
    total: int
    page: int
    page_size: int
    pages: int
    avg_rating: float
