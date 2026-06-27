import uuid
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import require_role, get_current_user
from app.models.user import User, FarmerProfile
from app.models.product import Product, ProductImage
from app.schemas.product import ProductCreate, ProductUpdate
from app.schemas.user import FarmerProfileUpdate
from app.services import farmer_service, product_service

router = APIRouter(prefix="/farmers", tags=["Farmers"])


@router.get("/", summary="List approved farmers (public)")
async def list_farmers(
    district: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Get list of all approved farmers (publicly accessible)."""
    stmt = (
        select(User, FarmerProfile)
        .join(FarmerProfile, FarmerProfile.user_id == User.id)
        .where(User.role == "farmer", FarmerProfile.status == "APPROVED", User.is_active == True)
    )
    if district:
        stmt = stmt.where(FarmerProfile.district.ilike(f"%{district}%"))

    from sqlalchemy import func
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total_result = await db.execute(count_stmt)
    total = total_result.scalar() or 0

    offset = (page - 1) * page_size
    stmt = stmt.offset(offset).limit(page_size)
    result = await db.execute(stmt)
    rows = result.all()

    farmers = []
    for user, profile in rows:
        farmers.append({
            "id": str(user.id),
            "name": user.name,
            "district": profile.district,
            "taluka": profile.taluka,
            "village": profile.village,
            "produce_types": profile.produce_types,
            "rating": profile.rating,
            "total_ratings": profile.total_ratings,
            "profile_photo_url": profile.profile_photo_url,
            "bio": profile.bio,
        })

    return {
        "items": farmers,
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": (total + page_size - 1) // page_size,
    }


@router.get("/me/dashboard", summary="Farmer dashboard", dependencies=[])
async def farmer_dashboard(
    farmer=Depends(require_role("farmer")),
    db: AsyncSession = Depends(get_db),
):
    """Get dashboard statistics for the logged-in farmer."""
    return await farmer_service.get_farmer_dashboard(farmer.id, db)


@router.get("/me/products", summary="Farmer's own products")
async def get_my_products(
    include_inactive: bool = False,
    farmer=Depends(require_role("farmer")),
    db: AsyncSession = Depends(get_db),
):
    """Get all products listed by the logged-in farmer."""
    products = await farmer_service.get_farmer_products(farmer.id, db, include_inactive)
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
            "stock": p.stock,
            "status": p.status,
            "is_organic": p.is_organic,
            "primary_image": primary_image,
            "category": p.category.name_en if p.category else None,
            "created_at": p.created_at.isoformat(),
        })
    return result


@router.post("/me/products", status_code=status.HTTP_201_CREATED, summary="Add new product")
async def add_product(
    category_id: uuid.UUID = Form(...),
    name_en: str = Form(...),
    name_mr: str = Form(...),
    price: float = Form(...),
    unit: str = Form(...),
    stock: int = Form(...),
    min_order_qty: int = Form(1),
    is_organic: bool = Form(False),
    description_en: Optional[str] = Form(None),
    description_mr: Optional[str] = Form(None),
    harvest_date: Optional[str] = Form(None),
    best_before_date: Optional[str] = Form(None),
    tags: str = Form("[]"),
    images: Optional[List[UploadFile]] = File(None),
    farmer=Depends(require_role("farmer")),
    db: AsyncSession = Depends(get_db),
):
    """Add a new product with optional images. Multipart form upload."""
    import json
    from decimal import Decimal
    from datetime import date

    tags_list = json.loads(tags) if tags else []

    product_data = ProductCreate(
        category_id=category_id,
        name_en=name_en,
        name_mr=name_mr,
        price=Decimal(str(price)),
        unit=unit,
        stock=stock,
        min_order_qty=min_order_qty,
        is_organic=is_organic,
        description_en=description_en,
        description_mr=description_mr,
        harvest_date=date.fromisoformat(harvest_date) if harvest_date else None,
        best_before_date=date.fromisoformat(best_before_date) if best_before_date else None,
        tags=tags_list,
    )

    product = await farmer_service.add_product(farmer.id, product_data, db, images)
    return {"message": "Product created successfully", "product_id": str(product.id)}


@router.put("/me/products/{product_id}", summary="Edit product")
async def update_product(
    product_id: uuid.UUID,
    body: ProductUpdate,
    farmer=Depends(require_role("farmer")),
    db: AsyncSession = Depends(get_db),
):
    """Update product details."""
    product = await farmer_service.update_product(product_id, farmer.id, body, db)
    return {"message": "Product updated", "product_id": str(product.id)}


@router.delete("/me/products/{product_id}", summary="Delete product (soft delete)")
async def delete_product(
    product_id: uuid.UUID,
    farmer=Depends(require_role("farmer")),
    db: AsyncSession = Depends(get_db),
):
    """Soft-delete a product (sets status to INACTIVE)."""
    await farmer_service.delete_product(product_id, farmer.id, db)
    return {"message": "Product deactivated successfully"}


@router.patch("/me/products/{product_id}/stock", summary="Quick stock update")
async def update_stock(
    product_id: uuid.UUID,
    body: dict,
    farmer=Depends(require_role("farmer")),
    db: AsyncSession = Depends(get_db),
):
    """Quickly update product stock quantity."""
    stock = body.get("stock")
    if stock is None or not isinstance(stock, int) or stock < 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid stock value")
    product = await farmer_service.update_stock(product_id, farmer.id, stock, db)
    return {"message": "Stock updated", "product_id": str(product.id), "new_stock": product.stock}


@router.get("/me/orders", summary="Farmer's orders")
async def get_farmer_orders(
    order_status: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    farmer=Depends(require_role("farmer")),
    db: AsyncSession = Depends(get_db),
):
    """Get orders containing this farmer's products."""
    result = await farmer_service.get_farmer_orders(farmer.id, db, order_status, page, page_size)
    return {
        "items": [
            {
                "id": str(o.id),
                "status": o.status,
                "payment_status": o.payment_status,
                "total_amount": float(o.total_amount),
                "created_at": o.created_at.isoformat(),
                "item_count": len(o.items),
            }
            for o in result["items"]
        ],
        "total": result["total"],
        "page": result["page"],
        "pages": result["pages"],
    }


@router.patch("/me/orders/{order_id}/status", summary="Update order status")
async def update_order_status(
    order_id: uuid.UUID,
    body: dict,
    farmer=Depends(require_role("farmer")),
    db: AsyncSession = Depends(get_db),
):
    """Update order status (e.g., CONFIRMED → PACKED → DISPATCHED → DELIVERED)."""
    new_status = body.get("status")
    tracking_number = body.get("tracking_number")
    carrier_name = body.get("carrier_name")

    if not new_status:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="status is required")

    order = await farmer_service.update_order_status(
        order_id, farmer.id, new_status, tracking_number, carrier_name, db
    )
    return {"message": "Order status updated", "order_id": str(order.id), "status": order.status}


@router.get("/me/earnings", summary="Farmer earnings summary")
async def get_earnings(
    farmer=Depends(require_role("farmer")),
    db: AsyncSession = Depends(get_db),
):
    """Get earnings summary with gross, commission deducted, and net payouts."""
    return await farmer_service.get_farmer_earnings(farmer.id, db)


@router.get("/me/profile", summary="Get my farmer profile")
async def get_my_profile(
    farmer=Depends(require_role("farmer")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(FarmerProfile).where(FarmerProfile.user_id == farmer.id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Farmer profile not found")
    return {
        "id": str(profile.id),
        "district": profile.district,
        "taluka": profile.taluka,
        "village": profile.village,
        "farm_size_acres": profile.farm_size_acres,
        "bio": profile.bio,
        "farm_description": profile.farm_description,
        "produce_types": profile.produce_types,
        "rating": profile.rating,
        "total_ratings": profile.total_ratings,
        "profile_photo_url": profile.profile_photo_url,
        "status": profile.status,
    }


@router.put("/me/profile", summary="Edit farmer profile")
async def update_farmer_profile(
    body: FarmerProfileUpdate,
    farmer=Depends(require_role("farmer")),
    db: AsyncSession = Depends(get_db),
):
    """Update farmer's own profile information."""
    result = await db.execute(
        select(FarmerProfile).where(FarmerProfile.user_id == farmer.id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Farmer profile not found")

    from datetime import datetime
    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(profile, field, value)
    profile.updated_at = datetime.utcnow()

    await db.flush()
    await db.refresh(profile)

    return {
        "message": "Profile updated",
        "district": profile.district,
        "taluka": profile.taluka,
        "village": profile.village,
    }


@router.get("/nearby", summary="Farmers near you (public)")
async def get_nearby_farmers(
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    """Return approved farmers ordered by rating as a proxy for nearby farmers."""
    from sqlalchemy import desc
    stmt = (
        select(User, FarmerProfile)
        .join(FarmerProfile, FarmerProfile.user_id == User.id)
        .where(User.role == "farmer", FarmerProfile.status == "APPROVED", User.is_active == True)
        .order_by(desc(FarmerProfile.rating))
        .limit(limit)
    )
    result = await db.execute(stmt)
    rows = result.all()
    return [
        {
            "id": str(user.id),
            "name": user.name,
            "district": profile.district,
            "taluka": profile.taluka,
            "village": profile.village,
            "produce_types": profile.produce_types,
            "rating": profile.rating,
            "total_ratings": profile.total_ratings,
            "profile_photo_url": profile.profile_photo_url,
            "bio": profile.bio,
        }
        for user, profile in rows
    ]


@router.get("/top-rated", summary="Top rated farmers (public)")
async def get_top_rated_farmers(
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    """Return approved farmers sorted by highest rating."""
    from sqlalchemy import desc
    stmt = (
        select(User, FarmerProfile)
        .join(FarmerProfile, FarmerProfile.user_id == User.id)
        .where(User.role == "farmer", FarmerProfile.status == "APPROVED", User.is_active == True)
        .order_by(desc(FarmerProfile.rating), desc(FarmerProfile.total_ratings))
        .limit(limit)
    )
    result = await db.execute(stmt)
    rows = result.all()
    return [
        {
            "id": str(user.id),
            "name": user.name,
            "district": profile.district,
            "taluka": profile.taluka,
            "village": profile.village,
            "produce_types": profile.produce_types,
            "rating": profile.rating,
            "total_ratings": profile.total_ratings,
            "profile_photo_url": profile.profile_photo_url,
            "bio": profile.bio,
        }
        for user, profile in rows
    ]


@router.get("/{farmer_id}", summary="Public farmer profile")
async def get_farmer_profile(
    farmer_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get public profile of an approved farmer."""
    from app.models.user import FarmerMedia

    result = await db.execute(
        select(User)
        .options(selectinload(User.farmer_profile))
        .where(User.id == farmer_id, User.role == "farmer")
    )
    farmer = result.scalar_one_or_none()

    if not farmer or not farmer.farmer_profile or farmer.farmer_profile.status != "APPROVED":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Farmer not found")

    profile = farmer.farmer_profile

    media_result = await db.execute(
        select(FarmerMedia).where(FarmerMedia.farmer_id == farmer_id).order_by(FarmerMedia.display_order)
    )
    media_items = media_result.scalars().all()

    return {
        "id": str(farmer.id),
        "full_name": farmer.name or "",
        "name": farmer.name or "",
        "phone": farmer.phone or "",
        "district": profile.district,
        "taluka": profile.taluka,
        "village": profile.village,
        "produce_types": profile.produce_types or [],
        "farm_size_acres": profile.farm_size_acres,
        "bio": profile.bio,
        "farm_description": profile.farm_description,
        "rating": float(profile.rating) if profile.rating else 0.0,
        "total_ratings": profile.total_ratings or 0,
        "total_orders_fulfilled": profile.total_orders_fulfilled if hasattr(profile, 'total_orders_fulfilled') else 0,
        "profile_photo": profile.profile_photo_url,
        "profile_photo_url": profile.profile_photo_url,
        "approval_status": profile.status,
        "member_since": farmer.created_at.isoformat(),
        "joined_date": farmer.created_at.isoformat(),
        "media": [
            {"id": str(m.id), "url": m.url, "media_type": m.media_type}
            for m in media_items
        ],
    }


@router.get("/{farmer_id}/products", summary="Farmer's active products")
async def get_farmer_products_public(
    farmer_id: uuid.UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Get active products listed by a specific farmer (public endpoint)."""
    from app.schemas.product import SearchParams
    params = SearchParams(farmer_id=farmer_id, page=page, page_size=page_size)
    products, total = await product_service.search_products(params, db)

    items = []
    for p in products:
        primary_image = next((img.image_url for img in p.images if img.is_primary), None)
        if not primary_image and p.images:
            primary_image = p.images[0].image_url
        items.append({
            "id": str(p.id),
            "name_en": p.name_en,
            "name_mr": p.name_mr,
            "price": float(p.price),
            "unit": p.unit,
            "stock": p.stock,
            "is_organic": p.is_organic,
            "primary_image": primary_image,
        })

    return {
        "items": items,
        "total": total,
        "page": page,
        "pages": (total + page_size - 1) // page_size,
    }


@router.get("/{farmer_id}/reviews", summary="Reviews for a farmer's products")
async def get_farmer_reviews(
    farmer_id: uuid.UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    rating: Optional[int] = Query(None, ge=1, le=5),
    db: AsyncSession = Depends(get_db),
):
    """Get all product reviews for a farmer (via direct farmer_id or farmer_product_listings)."""
    from app.models.review import Review
    from app.models.product import FarmerProductListing
    from sqlalchemy import and_

    # Collect product IDs belonging to this farmer
    direct = await db.execute(
        select(Product.id).where(Product.farmer_id == farmer_id)
    )
    listing = await db.execute(
        select(FarmerProductListing.product_id)
        .where(FarmerProductListing.farmer_id == farmer_id)
    )
    product_ids = list({r[0] for r in direct.all()} | {r[0] for r in listing.all()})

    if not product_ids:
        return {"items": [], "total": 0, "page": page, "pages": 0, "avg_rating": 0}

    base_where = [Review.product_id.in_(product_ids)]
    if rating is not None:
        base_where.append(Review.rating == rating)

    total_result = await db.execute(
        select(func.count(Review.id)).where(and_(*base_where))
    )
    total = total_result.scalar() or 0

    avg_result = await db.execute(
        select(func.avg(Review.rating)).where(Review.product_id.in_(product_ids))
    )
    avg_rating = round(float(avg_result.scalar() or 0), 1)

    offset = (page - 1) * page_size
    reviews_result = await db.execute(
        select(Review)
        .options(
            selectinload(Review.customer),
            selectinload(Review.product).selectinload(Product.images),
        )
        .where(and_(*base_where))
        .order_by(Review.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    reviews = reviews_result.scalars().all()

    def _primary_image(p) -> Optional[str]:
        if not p or not p.images:
            return None
        primary = next((img.image_url for img in p.images if img.is_primary), None)
        return primary or p.images[0].image_url

    return {
        "items": [
            {
                "id": str(r.id),
                "rating": r.rating,
                "comment": r.comment,
                "photos": [r.photo_url] if r.photo_url else [],
                "created_at": r.created_at.isoformat(),
                "customer": {
                    "id": str(r.customer.id) if r.customer else None,
                    "full_name": r.customer.name if r.customer else "Anonymous",
                    "profile_photo": None,
                },
                "product": str(r.product_id),
                "product_name_en": r.product.name_en if r.product else None,
                "product_name_mr": r.product.name_mr if r.product else None,
                "product_image": _primary_image(r.product),
            }
            for r in reviews
        ],
        "total": total,
        "page": page,
        "pages": (total + page_size - 1) // page_size,
        "avg_rating": avg_rating,
    }
