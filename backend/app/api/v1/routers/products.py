from typing import Optional
from uuid import UUID
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.schemas.product import SearchParams, ProductOut, PaginatedProductsOut
from app.services import product_service


async def _get_ratings_map(product_ids: list, db) -> dict:
    from app.models.review import Review
    if not product_ids:
        return {}
    rows = (await db.execute(
        select(
            Review.product_id,
            func.avg(Review.rating).label('avg'),
            func.count(Review.id).label('cnt'),
        )
        .where(Review.product_id.in_(product_ids))
        .group_by(Review.product_id)
    )).all()
    return {
        row.product_id: (round(float(row.avg), 1), int(row.cnt))
        for row in rows
    }


def _serialize_discount(discount) -> Optional[dict]:
    if not discount:
        return None
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    if discount.valid_from and discount.valid_from > now:
        return None
    if discount.valid_until and discount.valid_until < now:
        return None
    return {
        "discount_percent": float(discount.discount_percent),
        "valid_from": discount.valid_from.isoformat() if discount.valid_from else None,
        "valid_until": discount.valid_until.isoformat() if discount.valid_until else None,
    }

def _get_farmer_info(product) -> Optional[dict]:
    """Return farmer info from products.farmer_id first, then fall back to farmer_product_listings."""
    farmer = product.farmer
    if not farmer and hasattr(product, 'farmer_listings') and product.farmer_listings:
        active = [l for l in product.farmer_listings if l.status == 'ACTIVE']
        if active:
            farmer = active[0].farmer
    if not farmer:
        return None
    fp = farmer.farmer_profile
    return {
        "id": str(farmer.id),
        "name": farmer.name,
        "district": fp.district if fp else None,
        "rating": fp.rating if fp else 0,
        "photo": fp.profile_photo_url if fp else None,
    }


router = APIRouter(prefix="/products", tags=["Products"])


@router.get("/", response_model=PaginatedProductsOut, summary="List/search products")
async def list_products(
    q: Optional[str] = Query(None, description="Search query (supports Marathi/Hindi transliteration)"),
    category: Optional[str] = Query(None, description="Category slug (e.g. 'vegetables')"),
    category_id: Optional[UUID] = None,
    farmer_id: Optional[UUID] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    is_organic: Optional[bool] = None,
    unit: Optional[str] = None,
    in_stock: bool = True,
    sort_by: str = Query("created_at", description="Sort field: price, created_at, name_en, avg_rating"),
    sort_order: str = Query("desc", description="Sort order: asc or desc"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """List products with optional search and filters. Supports Marathi/Hindi transliteration."""
    from app.models.product import Category as CategoryModel

    # Resolve category slug → category_id if slug provided
    resolved_category_id = category_id
    if category and not resolved_category_id:
        result = await db.execute(
            select(CategoryModel.id).where(CategoryModel.slug == category)
        )
        resolved_category_id = result.scalar_one_or_none()

    params = SearchParams(
        q=q,
        category_id=resolved_category_id,
        farmer_id=farmer_id,
        min_price=min_price,
        max_price=max_price,
        is_organic=is_organic,
        unit=unit,
        in_stock=in_stock,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        page_size=page_size,
    )
    products, total = await product_service.search_products(params, db)

    ratings_map = await _get_ratings_map([p.id for p in products], db)

    items = []
    for p in products:
        images_list = []
        primary_image = None
        for img in p.images:
            if img.is_primary:
                primary_image = img.image_url
            images_list.append({"image_url": img.image_url, "is_primary": img.is_primary})
        if not primary_image and p.images:
            primary_image = p.images[0].image_url
            if images_list:
                images_list[0]["is_primary"] = True

        # Prefer direct farmer_id link, fall back to first active farmer_product_listing
        _farmer = p.farmer
        if not _farmer and hasattr(p, 'farmer_listings') and p.farmer_listings:
            active_l = [l for l in p.farmer_listings if l.status == 'ACTIVE']
            if active_l:
                _farmer = active_l[0].farmer
        farmer_name = _farmer.name if _farmer else None
        farmer_district = None
        farmer_rating = None
        if _farmer and _farmer.farmer_profile:
            farmer_district = _farmer.farmer_profile.district
            farmer_rating = float(_farmer.farmer_profile.rating) if _farmer.farmer_profile.rating is not None else None

        avg_r, rev_cnt = ratings_map.get(p.id, (None, 0))
        crit_diff = " ".join(p.critical_difference_en) if p.critical_difference_en else None
        crit_diff_mr = " ".join(p.critical_difference_mr) if p.critical_difference_mr else None

        items.append({
            "id": p.id,
            "name_en": p.name_en,
            "name_mr": p.name_mr,
            "price": p.price,
            "unit": p.unit,
            "stock": p.stock,
            "min_order_qty": p.min_order_qty,
            "is_organic": p.is_organic,
            "status": p.status,
            "primary_image": primary_image,
            "images": images_list,
            "category_slug": p.category.slug if p.category else None,
            "benefits": p.benefits or [],
            "benefits_mr": p.benefits_mr or [],
            "critical_difference": crit_diff,
            "critical_difference_mr": crit_diff_mr,
            "farmer_id": str(p.farmer_id) if p.farmer_id else None,
            "farmer_name": farmer_name,
            "farmer_district": farmer_district,
            "farmer_rating": farmer_rating,
            "discount": _serialize_discount(p.discount),
            "avg_rating": avg_r,
            "rating": avg_r,
            "review_count": rev_cnt,
            "created_at": p.created_at,
        })

    pages = (total + page_size - 1) // page_size
    return PaginatedProductsOut(items=items, total=total, page=page, page_size=page_size, pages=pages)


@router.get("/search", response_model=PaginatedProductsOut, summary="Full-text product search")
async def search_products(
    q: str = Query(..., description="Search term (Marathi, Hindi or English)"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Full-text search with Marathi/Hindi transliteration support."""
    params = SearchParams(q=q, page=page, page_size=page_size)
    products, total = await product_service.search_products(params, db)

    ratings_map = await _get_ratings_map([p.id for p in products], db)

    items = []
    for p in products:
        images_list = []
        primary_image = None
        for img in p.images:
            if img.is_primary:
                primary_image = img.image_url
            images_list.append({"image_url": img.image_url, "is_primary": img.is_primary})
        if not primary_image and p.images:
            primary_image = p.images[0].image_url
            if images_list:
                images_list[0]["is_primary"] = True

        farmer_district = None
        farmer_rating = None
        if p.farmer and p.farmer.farmer_profile:
            farmer_district = p.farmer.farmer_profile.district
            farmer_rating = float(p.farmer.farmer_profile.rating) if p.farmer.farmer_profile.rating is not None else None

        avg_r, rev_cnt = ratings_map.get(p.id, (None, 0))
        crit_diff = " ".join(p.critical_difference_en) if p.critical_difference_en else None
        crit_diff_mr = " ".join(p.critical_difference_mr) if p.critical_difference_mr else None

        items.append({
            "id": p.id,
            "name_en": p.name_en,
            "name_mr": p.name_mr,
            "price": p.price,
            "unit": p.unit,
            "stock": p.stock,
            "min_order_qty": p.min_order_qty,
            "is_organic": p.is_organic,
            "status": p.status,
            "primary_image": primary_image,
            "images": images_list,
            "category_slug": p.category.slug if p.category else None,
            "benefits": p.benefits or [],
            "benefits_mr": p.benefits_mr or [],
            "critical_difference": crit_diff,
            "critical_difference_mr": crit_diff_mr,
            "farmer_id": str(p.farmer_id) if p.farmer_id else None,
            "farmer_name": p.farmer.name if p.farmer else None,
            "farmer_district": farmer_district,
            "farmer_rating": farmer_rating,
            "discount": _serialize_discount(p.discount),
            "avg_rating": avg_r,
            "rating": avg_r,
            "review_count": rev_cnt,
            "created_at": p.created_at,
        })

    pages = (total + page_size - 1) // page_size
    return PaginatedProductsOut(items=items, total=total, page=page, page_size=page_size, pages=pages)


@router.get("/trending", summary="Get trending products")
async def get_trending(db: AsyncSession = Depends(get_db)):
    """Get top trending products based on order volume in last 7 days."""
    trending = await product_service.get_trending_products(db)
    return [
        {
            "product": {
                "id": str(item["product"].id),
                "name_en": item["product"].name_en,
                "name_mr": item["product"].name_mr,
                "price": float(item["product"].price),
                "unit": item["product"].unit,
                "primary_image": next(
                    (img.image_url for img in item["product"].images if img.is_primary),
                    item["product"].images[0].image_url if item["product"].images else None,
                ),
            },
            "total_sold": item["total_sold"],
        }
        for item in trending
    ]


@router.get("/today-picks", summary="Get today's fresh picks")
async def get_today_picks(db: AsyncSession = Depends(get_db)):
    """Get products harvested today or newly listed today."""
    products = await product_service.get_today_picks(db)
    result = []
    for p in products:
        primary_image = next((img.image_url for img in p.images if img.is_primary), None)
        if not primary_image and p.images:
            primary_image = p.images[0].image_url
        result.append({
            "id": str(p.id),
            "name_en": p.name_en,
            "name_mr": p.name_mr,
            "price": float(p.price),
            "unit": p.unit,
            "is_organic": p.is_organic,
            "harvest_date": p.harvest_date.isoformat() if p.harvest_date else None,
            "primary_image": primary_image,
            "farmer_name": p.farmer.name if p.farmer else None,
        })
    return result


@router.get("/recently-viewed", summary="Recently viewed products")
async def get_recently_viewed(db: AsyncSession = Depends(get_db)):
    """Placeholder — returns empty list until view tracking is implemented."""
    return []


@router.get("/{product_id}", summary="Get product detail")
async def get_product_detail(product_id: UUID, db: AsyncSession = Depends(get_db)):
    """Get full product details including images, farmer info, and reviews summary."""
    from fastapi import HTTPException, status
    product = await product_service.get_product_detail(product_id, db)
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    avg_rating = await product_service.get_product_avg_rating(product_id, db)

    return {
        "id": str(product.id),
        "farmer_id": str(product.farmer_id),
        "category_id": str(product.category_id),
        "name_en": product.name_en,
        "name_mr": product.name_mr,
        "description_en": product.description_en,
        "description_mr": product.description_mr,
        "price": float(product.price),
        "unit": product.unit,
        "min_order_qty": product.min_order_qty,
        "stock": product.stock,
        "is_organic": product.is_organic,
        "harvest_date": product.harvest_date.isoformat() if product.harvest_date else None,
        "best_before_date": product.best_before_date.isoformat() if product.best_before_date else None,
        "tags": product.tags,
        "benefits": product.benefits or [],
        "benefits_mr": product.benefits_mr or [],
        "critical_difference": " ".join(product.critical_difference_en) if product.critical_difference_en else None,
        "critical_difference_mr": " ".join(product.critical_difference_mr) if product.critical_difference_mr else None,
        "status": product.status,
        "images": [
            {"id": str(img.id), "image_url": img.image_url, "is_primary": img.is_primary, "order": img.display_order}
            for img in sorted(product.images, key=lambda x: x.display_order)
        ],
        "farmer": _get_farmer_info(product),
        "discount": _serialize_discount(product.discount),
        "avg_rating": avg_rating,
        "review_count": len(product.reviews),
        "created_at": product.created_at.isoformat(),
        "updated_at": product.updated_at.isoformat(),
    }


@router.get("/{product_id}/farmers", summary="Get farmers selling this product")
async def get_product_farmers(product_id: UUID, db: AsyncSession = Depends(get_db)):
    """Get list of all farmers who have an active listing for this product."""
    from app.models.product import FarmerProductListing
    from app.models.user import User
    from sqlalchemy.orm import selectinload as sil

    result = await db.execute(
        select(FarmerProductListing)
        .options(
            sil(FarmerProductListing.farmer).selectinload(User.farmer_profile),
            sil(FarmerProductListing.product),
        )
        .where(
            FarmerProductListing.product_id == product_id,
            FarmerProductListing.status == "ACTIVE",
            FarmerProductListing.stock > 0,
        )
        .order_by(FarmerProductListing.stock.desc())
    )
    listings = result.scalars().all()
    farmers = []
    for listing in listings:
        f = listing.farmer
        if not f:
            continue
        fp = f.farmer_profile
        farmers.append({
            "farmer_id": str(f.id),
            "farmer_name": f.name or "",
            "district": fp.district if fp else None,
            "taluka": fp.taluka if fp else None,
            "rating": float(fp.rating) if fp else 0.0,
            "total_ratings": fp.total_ratings if fp else 0,
            "profile_photo": fp.profile_photo_url if fp else None,
            "stock": listing.stock,
            "price_override": float(listing.price_override) if listing.price_override else None,
            "unit": listing.product.unit if listing.product else None,
        })
    return farmers


@router.get("/{product_id}/reviews", summary="Get product reviews")
async def get_product_reviews(
    product_id: UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Get paginated reviews for a product."""
    from app.services import review_service
    result = await review_service.get_product_reviews(product_id, db, page, page_size)
    return {
        "items": [
            {
                "id": str(r.id),
                "rating": r.rating,
                "comment": r.comment,
                "photos": [r.photo_url] if r.photo_url else [],
                "product": str(r.product_id) if r.product_id else None,
                "customer": {
                    "id": str(r.customer.id) if r.customer else 0,
                    "full_name": r.customer.name if r.customer else "Anonymous",
                    "profile_photo": None,
                },
                "created_at": r.created_at.isoformat(),
            }
            for r in result["items"]
        ],
        "total": result["total"],
        "page": result["page"],
        "pages": result["pages"],
        "avg_rating": result["avg_rating"],
    }


@router.get("/{product_id}/similar", summary="Get similar products")
async def get_similar_products(product_id: UUID, db: AsyncSession = Depends(get_db)):
    """Get similar products in the same category."""
    products = await product_service.get_similar_products(product_id, db)
    result = []
    for p in products:
        primary_image = next((img.image_url for img in p.images if img.is_primary), None)
        if not primary_image and p.images:
            primary_image = p.images[0].image_url
        result.append({
            "id": str(p.id),
            "name_en": p.name_en,
            "name_mr": p.name_mr,
            "price": float(p.price),
            "unit": p.unit,
            "is_organic": p.is_organic,
            "primary_image": primary_image,
        })
    return result
