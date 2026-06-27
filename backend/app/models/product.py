import uuid
from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List

from sqlalchemy import (
    String, Boolean, Enum, Integer, DateTime, Date, ForeignKey, Text, Numeric, UniqueConstraint
)
from sqlalchemy.dialects.postgresql import UUID, JSON, TSVECTOR
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class ProductDiscount(Base):
    __tablename__ = "product_discounts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False, unique=True, index=True
    )
    discount_percent: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    valid_from: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    valid_until: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    product: Mapped["Product"] = relationship("Product", back_populates="discount")


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name_en: Mapped[str] = mapped_column(String(100), nullable=False)
    name_mr: Mapped[str] = mapped_column(String(100), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    icon_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Relationships
    products: Mapped[List["Product"]] = relationship("Product", back_populates="category")


class Product(Base):
    __tablename__ = "products"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    farmer_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True
    )
    category_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("categories.id"), nullable=False, index=True
    )
    name_en: Mapped[str] = mapped_column(String(255), nullable=False)
    name_mr: Mapped[str] = mapped_column(String(255), nullable=False)
    description_en: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    description_mr: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    unit: Mapped[str] = mapped_column(
        Enum("kg", "piece", "dozen", "liter", "bundle", "gram", "quintal", name="product_unit"),
        nullable=False,
    )
    min_order_qty: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    stock: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_organic: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_fresh_farm: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    harvest_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    best_before_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    tags: Mapped[Optional[List]] = mapped_column(JSON, nullable=True, default=list)
    benefits: Mapped[Optional[List]] = mapped_column(JSON, nullable=True, default=list)
    benefits_mr: Mapped[Optional[List]] = mapped_column(JSON, nullable=True, default=list)
    critical_difference_en: Mapped[Optional[List]] = mapped_column(JSON, nullable=True, default=list)
    critical_difference_mr: Mapped[Optional[List]] = mapped_column(JSON, nullable=True, default=list)
    status: Mapped[str] = mapped_column(
        Enum("ACTIVE", "INACTIVE", "OUT_OF_STOCK", name="product_status"),
        default="ACTIVE",
        nullable=False,
    )
    search_vector: Mapped[Optional[str]] = mapped_column(TSVECTOR, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationships
    farmer: Mapped["User"] = relationship("User", foreign_keys=[farmer_id])
    category: Mapped["Category"] = relationship("Category", back_populates="products")
    images: Mapped[List["ProductImage"]] = relationship(
        "ProductImage", back_populates="product", cascade="all, delete-orphan",
        order_by="ProductImage.display_order"
    )
    discount: Mapped[Optional["ProductDiscount"]] = relationship(
        "ProductDiscount", back_populates="product", uselist=False, cascade="all, delete-orphan"
    )
    cart_items: Mapped[List["Cart"]] = relationship("Cart", back_populates="product")
    order_items: Mapped[List["OrderItem"]] = relationship("OrderItem", back_populates="product")
    reviews: Mapped[List["Review"]] = relationship("Review", back_populates="product")
    farmer_listings: Mapped[List["FarmerProductListing"]] = relationship(
        "FarmerProductListing", back_populates="product", cascade="all, delete-orphan"
    )


class ProductImage(Base):
    __tablename__ = "product_images"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False
    )
    image_url: Mapped[str] = mapped_column(String(512), nullable=False)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Relationships
    product: Mapped["Product"] = relationship("Product", back_populates="images")


class FarmerProductListing(Base):
    __tablename__ = "farmer_product_listings"

    __table_args__ = (UniqueConstraint("farmer_id", "product_id", name="uq_farmer_product"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    farmer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True
    )
    stock: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    price_override: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    farmer: Mapped["User"] = relationship("User", foreign_keys=[farmer_id])
    product: Mapped["Product"] = relationship("Product", back_populates="farmer_listings")
