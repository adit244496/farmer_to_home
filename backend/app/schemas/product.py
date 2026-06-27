import uuid
from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List

from pydantic import BaseModel, ConfigDict, field_validator


class CategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name_en: str
    name_mr: str
    slug: str
    icon_url: Optional[str] = None
    is_active: bool


class CategoryCreate(BaseModel):
    name_en: str
    name_mr: str
    slug: str
    icon_url: Optional[str] = None


class ProductImageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    image_url: str
    is_primary: bool
    display_order: int


class ProductCreate(BaseModel):
    category_id: uuid.UUID
    name_en: str
    name_mr: str
    description_en: Optional[str] = None
    description_mr: Optional[str] = None
    price: Decimal
    unit: str
    min_order_qty: int = 1
    stock: int
    is_organic: bool = False
    harvest_date: Optional[date] = None
    best_before_date: Optional[date] = None
    tags: List[str] = []

    @field_validator("unit")
    @classmethod
    def validate_unit(cls, v: str) -> str:
        valid = {"kg", "piece", "dozen", "liter", "bundle", "gram", "quintal"}
        if v not in valid:
            raise ValueError(f"unit must be one of {valid}")
        return v

    @field_validator("price")
    @classmethod
    def validate_price(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("Price must be greater than 0")
        return v

    @field_validator("stock")
    @classmethod
    def validate_stock(cls, v: int) -> int:
        if v < 0:
            raise ValueError("Stock cannot be negative")
        return v


class ProductUpdate(BaseModel):
    category_id: Optional[uuid.UUID] = None
    name_en: Optional[str] = None
    name_mr: Optional[str] = None
    description_en: Optional[str] = None
    description_mr: Optional[str] = None
    price: Optional[Decimal] = None
    unit: Optional[str] = None
    min_order_qty: Optional[int] = None
    stock: Optional[int] = None
    is_organic: Optional[bool] = None
    harvest_date: Optional[date] = None
    best_before_date: Optional[date] = None
    tags: Optional[List[str]] = None
    status: Optional[str] = None


class StockUpdate(BaseModel):
    stock: int

    @field_validator("stock")
    @classmethod
    def validate_stock(cls, v: int) -> int:
        if v < 0:
            raise ValueError("Stock cannot be negative")
        return v


class FarmerSummaryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: Optional[str] = None
    district: Optional[str] = None
    rating: float = 0.0


class DiscountOut(BaseModel):
    discount_percent: float
    valid_from: Optional[str] = None
    valid_until: Optional[str] = None


class ProductOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    farmer_id: uuid.UUID
    category_id: uuid.UUID
    name_en: str
    name_mr: str
    description_en: Optional[str] = None
    description_mr: Optional[str] = None
    price: Decimal
    unit: str
    min_order_qty: int
    stock: int
    is_organic: bool
    harvest_date: Optional[date] = None
    best_before_date: Optional[date] = None
    tags: Optional[List[str]] = None
    status: str
    images: List[ProductImageOut] = []
    discount: Optional[DiscountOut] = None
    created_at: datetime
    updated_at: datetime


class ProductListImageOut(BaseModel):
    image_url: str
    is_primary: bool


class ProductListOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name_en: str
    name_mr: str
    price: Decimal
    unit: str
    stock: int
    min_order_qty: int = 1
    is_organic: bool
    status: str
    primary_image: Optional[str] = None
    images: List[ProductListImageOut] = []
    category_slug: Optional[str] = None
    benefits: List[str] = []
    benefits_mr: List[str] = []
    critical_difference: Optional[str] = None
    critical_difference_mr: Optional[str] = None
    farmer_id: Optional[uuid.UUID] = None
    farmer_name: Optional[str] = None
    farmer_district: Optional[str] = None
    farmer_rating: Optional[float] = None
    discount: Optional[DiscountOut] = None
    avg_rating: Optional[float] = None
    rating: Optional[float] = None        # kept for backward compat
    review_count: int = 0
    created_at: datetime


class SearchParams(BaseModel):
    q: Optional[str] = None
    category_id: Optional[uuid.UUID] = None   # resolved from slug in the router
    category: Optional[str] = None            # slug — convenience for customer API
    farmer_id: Optional[uuid.UUID] = None
    min_price: Optional[Decimal] = None
    max_price: Optional[Decimal] = None
    is_organic: Optional[bool] = None
    unit: Optional[str] = None
    in_stock: bool = True
    sort_by: str = "created_at"
    sort_order: str = "desc"
    page: int = 1
    page_size: int = 20

    @field_validator("page")
    @classmethod
    def validate_page(cls, v: int) -> int:
        if v < 1:
            raise ValueError("page must be >= 1")
        return v

    @field_validator("page_size")
    @classmethod
    def validate_page_size(cls, v: int) -> int:
        if v < 1 or v > 100:
            raise ValueError("page_size must be between 1 and 100")
        return v


class PaginatedProductsOut(BaseModel):
    items: List[ProductListOut]
    total: int
    page: int
    page_size: int
    pages: int
