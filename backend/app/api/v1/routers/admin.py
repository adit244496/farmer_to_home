import uuid
from typing import Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update as sa_update
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import require_role
from app.core.config import settings
from app.models.order import PromoCode, Order
from app.models.user import User
from app.models.product import Product, ProductImage, ProductDiscount, Category, FarmerProductListing
from app.schemas.order import PromoCodeCreate, PromoCodeOut
from app.schemas.admin import FarmerApproval, AdminOrderStatusUpdate
from app.services import admin_service
from app.services.order_service import get_razorpay_client

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/dashboard", summary="Admin dashboard stats")
async def get_dashboard(
    admin=Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    """Get platform-wide dashboard statistics."""
    return await admin_service.get_dashboard_stats(db)


@router.get("/farmers", summary="List farmers")
async def list_farmers(
    status: Optional[str] = None,
    district: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    admin=Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    """List all farmers with optional filters. Admin only."""
    result = await admin_service.list_farmers(db, status, district, page, page_size)
    now = datetime.utcnow()
    return {
        "items": [
            {
                "id": str(u.id),
                "full_name": u.name,
                "phone": u.phone,
                "email": u.email,
                "is_active": u.is_active,
                "member_since": u.created_at.isoformat(),
                "is_new": (now - u.created_at).days < 30,
                "approval_status": (u.farmer_profile.status.lower() if u.farmer_profile else "pending"),
                "rating": float(u.farmer_profile.rating) if u.farmer_profile else 0.0,
                "district": (u.farmer_profile.district or "") if u.farmer_profile else "",
                "taluka": (u.farmer_profile.taluka or "") if u.farmer_profile else "",
                "village": "",
                "farm_size_acres": 0,
                "produce_types": [],
                "bio": None,
                "rejection_reason": None,
                "total_orders_fulfilled": 0,
            }
            for u in result["items"]
        ],
        "total": result["total"],
        "page": result["page"],
        "page_size": page_size,
    }


@router.get("/farmers/approved", summary="List approved farmers for dropdowns")
async def list_approved_farmers(
    admin=Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    result = await admin_service.list_farmers(db, "APPROVED", None, 1, 500)
    return [{"id": str(u.id), "name": u.name or u.phone} for u in result["items"]]


@router.post("/farmers", summary="Admin create farmer account")
async def admin_create_farmer(
    body: dict,
    admin=Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    from app.core.security import hash_password
    from app.models.user import FarmerProfile

    name = (body.get("name") or "").strip()
    phone = (body.get("phone") or "").strip()
    password = body.get("password") or ""

    if not name:
        raise HTTPException(status_code=400, detail="Name is required")
    if not phone:
        raise HTTPException(status_code=400, detail="Phone is required")
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    existing = await db.execute(select(User).where(User.phone == phone))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="A user with this phone number already exists")

    email = (body.get("email") or "").strip() or None
    if email:
        existing_email = await db.execute(select(User).where(User.email == email))
        if existing_email.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="A user with this email already exists")

    new_user = User(
        id=uuid.uuid4(),
        phone=phone,
        email=email,
        name=name,
        role="farmer",
        is_active=True,
        hashed_password=hash_password(password),
    )
    db.add(new_user)
    await db.flush()

    approval = (body.get("approval_status") or "APPROVED").strip().upper()
    if approval not in {"PENDING", "APPROVED"}:
        approval = "APPROVED"

    profile = FarmerProfile(
        id=uuid.uuid4(),
        user_id=new_user.id,
        district=(body.get("district") or "").strip() or None,
        taluka=(body.get("taluka") or "").strip() or None,
        village=(body.get("village") or "").strip() or None,
        bio=(body.get("bio") or "").strip() or None,
        status=approval,
    )
    db.add(profile)
    await db.commit()

    now = datetime.utcnow()
    return {
        "id": str(new_user.id),
        "full_name": new_user.name,
        "phone": new_user.phone,
        "email": new_user.email,
        "is_active": new_user.is_active,
        "member_since": new_user.created_at.isoformat(),
        "is_new": True,
        "approval_status": profile.status.lower(),
        "rating": 0.0,
        "district": profile.district or "",
        "taluka": profile.taluka or "",
        "village": profile.village or "",
        "farm_size_acres": 0,
        "produce_types": [],
        "bio": profile.bio,
        "rejection_reason": None,
        "total_orders_fulfilled": 0,
    }


@router.patch("/farmers/{farmer_id}/password", summary="Admin reset farmer password")
async def admin_reset_farmer_password(
    farmer_id: uuid.UUID,
    body: dict,
    admin=Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    from app.core.security import hash_password

    new_password = body.get("new_password") or ""
    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")

    result = await db.execute(select(User).where(User.id == farmer_id, User.role == "farmer"))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Farmer not found")

    user.hashed_password = hash_password(new_password)
    await db.commit()
    return {"message": "Password updated successfully"}


@router.get("/farmers/{farmer_id}", summary="Get farmer detail")
async def get_farmer_detail(
    farmer_id: uuid.UUID,
    admin=Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    """Get detailed farmer profile. Admin only."""
    from app.models.user import FarmerMedia
    result = await db.execute(
        select(User)
        .options(selectinload(User.farmer_profile).selectinload(User.farmer_profile.property.mapper.class_.media))
        .where(User.id == farmer_id, User.role == "farmer")
    )
    farmer = result.scalar_one_or_none()
    if not farmer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Farmer not found")

    p = farmer.farmer_profile
    media_result = await db.execute(
        select(FarmerMedia).where(FarmerMedia.farmer_id == farmer_id).order_by(FarmerMedia.display_order)
    )
    media_items = media_result.scalars().all()

    now = datetime.utcnow()
    return {
        "id": str(farmer.id),
        "full_name": farmer.name,
        "phone": farmer.phone,
        "email": farmer.email,
        "is_active": farmer.is_active,
        "member_since": farmer.created_at.isoformat(),
        "is_new": (now - farmer.created_at).days < 30,
        "approval_status": (p.status.lower() if p else "pending"),
        "rating": float(p.rating) if p else 0.0,
        "district": (p.district or "") if p else "",
        "taluka": (p.taluka or "") if p else "",
        "village": (p.village or "") if p else "",
        "farm_size_acres": float(p.farm_size_acres) if p and p.farm_size_acres else 0.0,
        "produce_types": (p.produce_types or []) if p else [],
        "bio": p.bio if p else None,
        "farm_description": p.farm_description if p else None,
        "rejection_reason": p.rejection_reason if p else None,
        "total_orders_fulfilled": 0,
        "profile_photo_url": p.profile_photo_url if p else None,
        "media": [
            {"id": str(m.id), "url": m.url, "media_type": m.media_type, "display_order": m.display_order}
            for m in media_items
        ],
    }


@router.post("/farmers/{farmer_id}/approve", summary="Approve farmer")
async def approve_farmer(
    farmer_id: uuid.UUID,
    admin=Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    """Approve a pending farmer account. Admin only."""
    profile = await admin_service.approve_farmer(farmer_id, admin.id, db)
    return {"message": "Farmer approved", "farmer_id": str(farmer_id), "status": profile.status}


@router.post("/farmers/{farmer_id}/reject", summary="Reject farmer")
async def reject_farmer(
    farmer_id: uuid.UUID,
    body: dict,
    admin=Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    """Reject a farmer application with reason. Admin only."""
    reason = body.get("reason", "")
    if not reason:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Rejection reason is required")
    profile = await admin_service.reject_farmer(farmer_id, reason, admin.id, db)
    return {"message": "Farmer rejected", "farmer_id": str(farmer_id), "status": profile.status}


@router.post("/farmers/{farmer_id}/suspend", summary="Suspend farmer")
async def suspend_farmer(
    farmer_id: uuid.UUID,
    admin=Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    """Suspend a farmer and deactivate all their products. Admin only."""
    profile = await admin_service.suspend_farmer(farmer_id, db)
    return {"message": "Farmer suspended", "farmer_id": str(farmer_id), "status": profile.status}


@router.put("/farmers/{farmer_id}", summary="Update farmer details")
async def update_farmer_details(
    farmer_id: uuid.UUID,
    body: dict,
    admin=Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    """Update farmer name, contact and profile fields. Admin only."""
    from app.models.user import FarmerProfile

    result = await db.execute(
        select(User).options(selectinload(User.farmer_profile))
        .where(User.id == farmer_id, User.role == "farmer")
    )
    farmer = result.scalar_one_or_none()
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")

    if "name" in body and body["name"]:
        farmer.name = body["name"].strip()
    if "phone" in body and body["phone"]:
        farmer.phone = body["phone"].strip()
    if "email" in body:
        farmer.email = (body["email"] or "").strip() or None

    p = farmer.farmer_profile
    if p:
        for field in ["district", "taluka", "village", "bio", "farm_description"]:
            if field in body:
                setattr(p, field, (body[field] or "").strip() or None)
        if "farm_size_acres" in body and body["farm_size_acres"] is not None:
            try:
                p.farm_size_acres = float(body["farm_size_acres"])
            except (ValueError, TypeError):
                pass
        if "produce_types" in body:
            p.produce_types = [t.strip() for t in (body["produce_types"] or []) if t.strip()]

    await db.commit()
    return {"message": "Farmer updated successfully"}


@router.delete("/farmers/{farmer_id}", summary="Delete farmer account")
async def delete_farmer_account(
    farmer_id: uuid.UUID,
    admin=Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    """Soft-delete a farmer account by deactivating it. Admin only."""
    result = await db.execute(select(User).where(User.id == farmer_id, User.role == "farmer"))
    farmer = result.scalar_one_or_none()
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")
    farmer.is_active = False
    await db.commit()
    return {"message": "Farmer account deactivated"}


@router.post("/farmers/{farmer_id}/media", summary="Upload media for farmer")
async def upload_farmer_media(
    farmer_id: uuid.UUID,
    file: UploadFile = File(...),
    media_type: str = Form("image"),
    admin=Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    """Upload an image or video for a farmer's profile gallery. Admin only."""
    from app.models.user import FarmerMedia

    result = await db.execute(select(User).where(User.id == farmer_id, User.role == "farmer"))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Farmer not found")

    ext = (file.filename or "file").rsplit(".", 1)[-1].lower()
    key = f"farmers/{farmer_id}/{uuid.uuid4()}.{ext}"
    url: Optional[str] = None

    if settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY and settings.AWS_BUCKET_NAME:
        try:
            import boto3
            s3 = boto3.client(
                "s3",
                region_name=settings.AWS_REGION,
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            )
            content = await file.read()
            s3.put_object(
                Bucket=settings.AWS_BUCKET_NAME,
                Key=key,
                Body=content,
                ContentType=file.content_type or "application/octet-stream",
            )
            url = f"https://{settings.AWS_BUCKET_NAME}.s3.{settings.AWS_REGION}.amazonaws.com/{key}"
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Upload failed: {e}")
    else:
        raise HTTPException(status_code=503, detail="S3 storage not configured")

    count_result = await db.execute(
        select(func.count()).select_from(FarmerMedia).where(FarmerMedia.farmer_id == farmer_id)
    )
    order = count_result.scalar() or 0

    media = FarmerMedia(id=uuid.uuid4(), farmer_id=farmer_id, url=url, media_type=media_type, display_order=order)
    db.add(media)
    await db.commit()
    return {"id": str(media.id), "url": url, "media_type": media_type, "display_order": order}


@router.delete("/farmers/{farmer_id}/media/{media_id}", summary="Delete farmer media")
async def delete_farmer_media(
    farmer_id: uuid.UUID,
    media_id: uuid.UUID,
    admin=Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    """Delete a media item from a farmer's gallery. Admin only."""
    from app.models.user import FarmerMedia

    result = await db.execute(
        select(FarmerMedia).where(FarmerMedia.id == media_id, FarmerMedia.farmer_id == farmer_id)
    )
    media = result.scalar_one_or_none()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")

    await db.delete(media)
    await db.commit()
    return {"message": "Media deleted"}


@router.get("/farmers/{farmer_id}/inventory", summary="Farmer inventory (admin view)")
async def get_farmer_inventory(
    farmer_id: uuid.UUID,
    admin=Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    """View all products for a farmer. Admin only."""
    products = await admin_service.get_farmer_inventory(farmer_id, db)
    return [
        {
            "id": str(p.id),
            "name_en": p.name_en,
            "name_mr": p.name_mr or "",
            "category": p.category.slug if p.category else "",
            "price_per_unit": float(p.price),
            "unit": p.unit,
            "stock_quantity": p.stock,
            "is_organic": p.is_organic,
            "is_active": p.status == "ACTIVE",
        }
        for p in products
    ]


@router.put("/farmers/{farmer_id}/products/{product_id}", summary="Admin edit product")
async def admin_edit_product(
    farmer_id: uuid.UUID,
    product_id: uuid.UUID,
    body: dict,
    admin=Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    """Update a farmer's product (admin override). Admin only."""
    reason = body.pop("reason", "Admin update")
    product = await admin_service.admin_update_product(product_id, body, reason, db)
    return {"message": "Product updated", "product_id": str(product.id)}


@router.patch("/farmers/{farmer_id}/products/{product_id}/stock", summary="Admin stock update")
async def admin_update_stock(
    farmer_id: uuid.UUID,
    product_id: uuid.UUID,
    body: dict,
    admin=Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    """Update stock for a farmer's product. Admin only."""
    from app.models.product import Product
    from datetime import datetime
    result = await db.execute(
        select(Product).where(Product.id == product_id, Product.farmer_id == farmer_id)
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    stock = body.get("stock")
    if stock is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="stock is required")

    product.stock = int(stock)
    if product.stock == 0:
        product.status = "OUT_OF_STOCK"
    elif product.status == "OUT_OF_STOCK":
        product.status = "ACTIVE"
    product.updated_at = datetime.utcnow()
    await db.flush()

    return {"message": "Stock updated", "product_id": str(product_id), "new_stock": product.stock}


@router.post("/products", summary="Admin add product on behalf of farmer")
async def admin_add_product(
    body: dict,
    admin=Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    from decimal import Decimal as D
    from datetime import date as date_type

    farmer_id_raw = body.get("farmer_id")
    if farmer_id_raw:
        try:
            farmer_id = uuid.UUID(str(farmer_id_raw))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid farmer_id")
        result = await db.execute(select(User).where(User.id == farmer_id, User.role == "farmer"))
        if not result.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Farmer not found")
    else:
        farmer_id = None

    try:
        category_id = uuid.UUID(str(body.get("category_id", "")))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid category_id")

    result = await db.execute(select(Category).where(Category.id == category_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Category not found")

    name_en = (body.get("name_en") or "").strip()
    if not name_en:
        raise HTTPException(status_code=400, detail="name_en is required")

    price_raw = body.get("price")
    try:
        price = D(str(price_raw))
        if price <= 0:
            raise ValueError
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="price must be a positive number")

    unit = body.get("unit", "kg")
    if unit not in {"kg", "piece", "dozen", "liter", "bundle", "gram", "quintal"}:
        raise HTTPException(status_code=400, detail="Invalid unit")

    stock = max(0, int(body.get("stock", 0)))
    product = Product(
        id=uuid.uuid4(),
        farmer_id=farmer_id if farmer_id else None,
        category_id=category_id,
        name_en=name_en,
        name_mr=(body.get("name_mr") or "").strip(),
        description_en=body.get("description_en") or None,
        description_mr=body.get("description_mr") or None,
        price=price,
        unit=unit,
        min_order_qty=max(1, int(body.get("min_order_qty", 1))),
        stock=stock,
        is_organic=bool(body.get("is_organic", False)),
        is_fresh_farm=bool(body.get("is_fresh_farm", False)),
        harvest_date=date_type.fromisoformat(body["harvest_date"]) if body.get("harvest_date") else None,
        best_before_date=date_type.fromisoformat(body["best_before_date"]) if body.get("best_before_date") else None,
        tags=list(body.get("tags") or []),
        benefits=list(body.get("benefits") or []),
        benefits_mr=list(body.get("benefits_mr") or []),
        critical_difference_en=list(body.get("critical_difference_en") or []),
        critical_difference_mr=list(body.get("critical_difference_mr") or []),
        status="OUT_OF_STOCK" if stock == 0 else "ACTIVE",
    )
    db.add(product)
    await db.commit()

    result = await db.execute(
        select(Product)
        .options(
            selectinload(Product.images),
            selectinload(Product.discount),
            selectinload(Product.category),
            selectinload(Product.farmer),
        )
        .where(Product.id == product.id)
    )
    product = result.scalar_one_or_none()
    return _serialize_product(product)


def _serialize_product(p: Product) -> dict:
    """Serialize a Product ORM object to the admin product dict."""
    d = p.discount
    active_discount = None
    if d and d.is_active:
        now = datetime.utcnow()
        in_window = (d.valid_from is None or d.valid_from <= now) and (
            d.valid_until is None or d.valid_until >= now
        )
        if in_window:
            active_discount = {
                "id": str(d.id),
                "discount_percent": float(d.discount_percent),
                "valid_from": d.valid_from.isoformat() if d.valid_from else None,
                "valid_until": d.valid_until.isoformat() if d.valid_until else None,
                "is_active": d.is_active,
            }

    images = sorted(p.images or [], key=lambda i: i.display_order)
    return {
        "id": str(p.id),
        "name_en": p.name_en,
        "name_mr": p.name_mr or "",
        "description_en": p.description_en or "",
        "description_mr": p.description_mr or "",
        "price": float(p.price),
        "unit": p.unit,
        "min_order_qty": p.min_order_qty,
        "stock": p.stock,
        "status": p.status,
        "is_organic": p.is_organic,
        "is_fresh_farm": p.is_fresh_farm,
        "harvest_date": p.harvest_date.isoformat() if p.harvest_date else None,
        "best_before_date": p.best_before_date.isoformat() if p.best_before_date else None,
        "tags": p.tags or [],
        "benefits": p.benefits or [],
        "benefits_mr": p.benefits_mr or [],
        "critical_difference_en": p.critical_difference_en or [],
        "critical_difference_mr": p.critical_difference_mr or [],
        "category_id": str(p.category_id),
        "category_slug": p.category.slug if p.category else "",
        "category_name": p.category.name_en if p.category else "",
        "farmer_id": str(p.farmer_id) if p.farmer_id else None,
        "farmer_name": p.farmer.name if p.farmer else "",
        "images": [
            {
                "id": str(img.id),
                "url": img.image_url,
                "is_primary": img.is_primary,
                "display_order": img.display_order,
            }
            for img in images
        ],
        "discount": active_discount,
        "created_at": p.created_at.isoformat(),
        "updated_at": p.updated_at.isoformat(),
    }


@router.post("/upload/presign", summary="Generate S3 presigned PUT URL for direct upload")
async def generate_upload_presign(
    body: dict,
    admin=Depends(require_role("admin")),
):
    import boto3
    from botocore.exceptions import ClientError, NoCredentialsError
    import re

    if not settings.AWS_ACCESS_KEY_ID or not settings.AWS_SECRET_ACCESS_KEY:
        raise HTTPException(
            status_code=503,
            detail="S3 not configured. Add AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY to .env",
        )

    filename = (body.get("filename") or "upload.jpg").strip()
    content_type = (body.get("content_type") or "image/jpeg").strip()
    safe_name = re.sub(r"[^\w.\-]", "_", filename)
    key = f"products/{uuid.uuid4()}/{safe_name}"

    s3 = boto3.client(
        "s3",
        region_name=settings.AWS_REGION,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
    )
    try:
        upload_url = s3.generate_presigned_url(
            "put_object",
            Params={"Bucket": settings.AWS_BUCKET_NAME, "Key": key, "ContentType": content_type},
            ExpiresIn=300,
        )
    except (ClientError, NoCredentialsError) as e:
        raise HTTPException(status_code=500, detail=f"S3 error: {e}")

    file_url = f"https://{settings.AWS_BUCKET_NAME}.s3.{settings.AWS_REGION}.amazonaws.com/{key}"
    return {"upload_url": upload_url, "file_url": file_url}


@router.get("/products/all", summary="List all products (admin)")
async def list_all_products(
    status_filter: Optional[str] = Query(None, alias="status"),
    category: Optional[str] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=500),
    admin=Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    """List all products across all farmers with images, discount, and farmer info."""
    stmt = (
        select(Product)
        .options(
            selectinload(Product.images),
            selectinload(Product.discount),
            selectinload(Product.category),
            selectinload(Product.farmer),
        )
    )

    if status_filter:
        stmt = stmt.where(Product.status == status_filter.upper())
    if category:
        stmt = stmt.join(Category, Category.id == Product.category_id).where(
            Category.slug == category
        )
    if search:
        stmt = stmt.where(
            Product.name_en.ilike(f"%{search}%") | Product.name_mr.ilike(f"%{search}%")
        )

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar() or 0

    offset = (page - 1) * page_size
    stmt = stmt.order_by(Product.created_at.desc()).offset(offset).limit(page_size)
    products = (await db.execute(stmt)).scalars().all()

    return {
        "items": [_serialize_product(p) for p in products],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get("/products/{product_id}", summary="Get product detail (admin)")
async def get_admin_product(
    product_id: uuid.UUID,
    admin=Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Product)
        .options(
            selectinload(Product.images),
            selectinload(Product.discount),
            selectinload(Product.category),
            selectinload(Product.farmer),
        )
        .where(Product.id == product_id)
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return _serialize_product(product)


@router.patch("/products/{product_id}", summary="Edit product details (admin)")
async def admin_patch_product(
    product_id: uuid.UUID,
    body: dict,
    admin=Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    from decimal import Decimal as D
    from datetime import date as date_type

    result = await db.execute(
        select(Product)
        .options(
            selectinload(Product.images),
            selectinload(Product.discount),
            selectinload(Product.category),
            selectinload(Product.farmer),
        )
        .where(Product.id == product_id)
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    ALLOWED = {
        "name_en", "name_mr", "description_en", "description_mr",
        "price", "unit", "min_order_qty", "is_organic", "is_fresh_farm",
        "harvest_date", "best_before_date", "tags", "benefits", "benefits_mr",
        "critical_difference_en", "critical_difference_mr", "category_id",
        "farmer_id",
    }
    VALID_UNITS = {"kg", "piece", "dozen", "liter", "bundle", "gram", "quintal"}

    for field, value in body.items():
        if field not in ALLOWED:
            continue
        if field == "price":
            product.price = D(str(value))
        elif field in ("harvest_date", "best_before_date"):
            setattr(product, field, date_type.fromisoformat(value) if value else None)
        elif field == "category_id":
            product.category_id = uuid.UUID(str(value))
        elif field == "farmer_id":
            product.farmer_id = uuid.UUID(str(value)) if value else None
        elif field == "min_order_qty":
            product.min_order_qty = max(1, int(value))
        elif field == "unit":
            if value in VALID_UNITS:
                product.unit = value
        elif field == "tags":
            product.tags = list(value) if value else []
        elif field == "benefits":
            product.benefits = list(value) if value else []
        elif field == "benefits_mr":
            product.benefits_mr = list(value) if value else []
        elif field == "critical_difference_en":
            product.critical_difference_en = list(value) if value else []
        elif field == "critical_difference_mr":
            product.critical_difference_mr = list(value) if value else []
        elif field == "is_organic":
            product.is_organic = bool(value)
        else:
            setattr(product, field, value)

    product.updated_at = datetime.utcnow()
    await db.commit()

    result = await db.execute(
        select(Product)
        .options(
            selectinload(Product.images),
            selectinload(Product.discount),
            selectinload(Product.category),
            selectinload(Product.farmer),
        )
        .where(Product.id == product_id)
    )
    product = result.scalar_one_or_none()
    return _serialize_product(product)


@router.patch("/products/{product_id}/status", summary="Set product status (admin)")
async def set_product_status(
    product_id: uuid.UUID,
    body: dict,
    admin=Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    new_status = body.get("status", "").upper()
    if new_status not in ("ACTIVE", "INACTIVE", "OUT_OF_STOCK"):
        raise HTTPException(status_code=400, detail="Invalid status")

    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    product.status = new_status
    product.updated_at = datetime.utcnow()
    await db.commit()
    return {"message": "Status updated", "status": new_status}


@router.post("/products/{product_id}/discount", summary="Set/update discount on a product")
async def upsert_product_discount(
    product_id: uuid.UUID,
    body: dict,
    admin=Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    from decimal import Decimal as D

    discount_percent = body.get("discount_percent")
    if discount_percent is None or not (0 < float(discount_percent) <= 100):
        raise HTTPException(status_code=400, detail="discount_percent must be between 0 and 100")

    result = await db.execute(
        select(Product).options(selectinload(Product.discount)).where(Product.id == product_id)
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    valid_from = None
    valid_until = None
    if body.get("valid_from"):
        valid_from = datetime.fromisoformat(body["valid_from"])
    if body.get("valid_until"):
        valid_until = datetime.fromisoformat(body["valid_until"])

    if product.discount:
        product.discount.discount_percent = D(str(discount_percent))
        product.discount.valid_from = valid_from
        product.discount.valid_until = valid_until
        product.discount.is_active = True
    else:
        disc = ProductDiscount(
            id=uuid.uuid4(),
            product_id=product_id,
            discount_percent=D(str(discount_percent)),
            valid_from=valid_from,
            valid_until=valid_until,
            is_active=True,
        )
        db.add(disc)

    await db.commit()
    return {"message": "Discount set", "discount_percent": float(discount_percent)}


@router.delete("/products/{product_id}/discount", summary="Remove discount from a product")
async def remove_product_discount(
    product_id: uuid.UUID,
    admin=Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ProductDiscount).where(ProductDiscount.product_id == product_id)
    )
    disc = result.scalar_one_or_none()
    if not disc:
        raise HTTPException(status_code=404, detail="No discount found for this product")
    await db.delete(disc)
    await db.commit()
    return {"message": "Discount removed"}


@router.post("/products/{product_id}/images", summary="Add image URL to product")
async def add_product_image_url(
    product_id: uuid.UUID,
    body: dict,
    admin=Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    image_url = (body.get("url") or "").strip()
    if not image_url:
        raise HTTPException(status_code=400, detail="url is required")

    result = await db.execute(select(Product).where(Product.id == product_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Product not found")

    count_result = await db.execute(
        select(func.count()).where(ProductImage.product_id == product_id)
    )
    existing_count = count_result.scalar() or 0

    img = ProductImage(
        id=uuid.uuid4(),
        product_id=product_id,
        image_url=image_url,
        is_primary=existing_count == 0,
        display_order=existing_count,
    )
    db.add(img)
    await db.commit()
    return {"message": "Image added", "image_id": str(img.id), "url": image_url, "is_primary": img.is_primary}


@router.delete("/products/{product_id}/images/{image_id}", summary="Remove product image")
async def remove_product_image_url(
    product_id: uuid.UUID,
    image_id: uuid.UUID,
    admin=Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ProductImage).where(
            ProductImage.id == image_id, ProductImage.product_id == product_id
        )
    )
    img = result.scalar_one_or_none()
    if not img:
        raise HTTPException(status_code=404, detail="Image not found")

    was_primary = img.is_primary
    await db.delete(img)
    await db.flush()

    if was_primary:
        remaining = await db.execute(
            select(ProductImage)
            .where(ProductImage.product_id == product_id)
            .order_by(ProductImage.display_order)
            .limit(1)
        )
        first = remaining.scalar_one_or_none()
        if first:
            first.is_primary = True

    await db.commit()
    return {"message": "Image removed"}


@router.patch("/products/{product_id}/stock", summary="Update product stock (admin)")
async def update_product_stock(
    product_id: uuid.UUID,
    body: dict,
    admin=Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    stock = body.get("stock")
    if stock is None or int(stock) < 0:
        raise HTTPException(status_code=400, detail="stock must be a non-negative integer")

    result = await db.execute(
        select(Product).options(selectinload(Product.discount), selectinload(Product.images),
                                selectinload(Product.category), selectinload(Product.farmer))
        .where(Product.id == product_id)
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    product.stock = int(stock)
    if product.stock == 0:
        product.status = "OUT_OF_STOCK"
    elif product.status == "OUT_OF_STOCK":
        product.status = "ACTIVE"
    product.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(product)
    return _serialize_product(product)


# ─── Categories (Admin) ──────────────────────────────────────────────────────

@router.get("/categories", summary="List all categories with product counts (admin)")
async def admin_list_categories(
    admin=Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Category).order_by(Category.display_order, Category.name_en))
    categories = result.scalars().all()

    counts: dict = {}
    if categories:
        count_result = await db.execute(
            select(Product.category_id, func.count(Product.id).label("cnt"))
            .group_by(Product.category_id)
        )
        counts = {str(row.category_id): row.cnt for row in count_result.all()}

    return [
        {
            "id": str(c.id),
            "name_en": c.name_en,
            "name_mr": c.name_mr,
            "slug": c.slug,
            "icon_url": c.icon_url,
            "is_active": c.is_active,
            "display_order": c.display_order,
            "product_count": counts.get(str(c.id), 0),
        }
        for c in categories
    ]


@router.post("/categories", summary="Create a new category (admin)")
async def admin_create_category(
    body: dict,
    admin=Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    import re

    name_en = (body.get("name_en") or "").strip()
    if not name_en:
        raise HTTPException(status_code=400, detail="name_en is required")

    slug = re.sub(r"[^a-z0-9]+", "-", name_en.lower()).strip("-")
    existing = await db.execute(select(Category).where(Category.slug == slug))
    if existing.scalar_one_or_none():
        slug = f"{slug}-{uuid.uuid4().hex[:6]}"

    max_order_result = await db.execute(select(func.max(Category.display_order)))
    max_order = max_order_result.scalar() or 0

    cat = Category(
        id=uuid.uuid4(),
        name_en=name_en,
        name_mr=(body.get("name_mr") or name_en).strip(),
        slug=slug,
        icon_url=(body.get("icon_url") or "").strip() or None,
        is_active=bool(body.get("is_active", True)),
        display_order=max_order + 1,
    )
    db.add(cat)
    await db.commit()
    return {
        "id": str(cat.id),
        "name_en": cat.name_en,
        "name_mr": cat.name_mr,
        "slug": cat.slug,
        "icon_url": cat.icon_url,
        "is_active": cat.is_active,
        "display_order": cat.display_order,
        "product_count": 0,
    }


@router.post("/categories/reorder", summary="Reorder categories (admin)")
async def admin_reorder_categories(
    body: dict,
    admin=Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    order: list = body.get("order", [])
    for idx, cat_id_str in enumerate(order):
        try:
            cat_id = uuid.UUID(str(cat_id_str))
        except ValueError:
            continue
        await db.execute(
            sa_update(Category).where(Category.id == cat_id).values(display_order=idx)
        )
    await db.commit()
    return {"message": "Order updated"}


@router.patch("/categories/{category_id}", summary="Update category icon and visibility (admin)")
async def admin_update_category(
    category_id: uuid.UUID,
    body: dict,
    admin=Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Category).where(Category.id == category_id))
    cat = result.scalar_one_or_none()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")

    if "icon_url" in body:
        cat.icon_url = (body["icon_url"] or "").strip() or None
    if "is_active" in body:
        cat.is_active = bool(body["is_active"])
    if "name_en" in body:
        cat.name_en = body["name_en"].strip()
    if "name_mr" in body:
        cat.name_mr = body["name_mr"].strip()
    if "display_order" in body:
        cat.display_order = int(body["display_order"])

    await db.commit()
    return {
        "id": str(cat.id),
        "name_en": cat.name_en,
        "name_mr": cat.name_mr,
        "slug": cat.slug,
        "icon_url": cat.icon_url,
        "is_active": cat.is_active,
        "display_order": cat.display_order,
    }


# ─── App Sections (Admin) ────────────────────────────────────────────────────

_DEFAULT_SECTIONS = [
    {"key": "banner_carousel",    "label": "Banner / Carousel",       "description": "Hero banner and promotional slides at the top of home screen.", "icon": "image", "display_order": 0},
    {"key": "featured_products",  "label": "Featured Products",        "description": "Handpicked products highlighted on the home screen.", "icon": "star", "display_order": 1},
    {"key": "categories_browse",  "label": "Browse by Category",       "description": "Category chips / grid that let customers filter by type.", "icon": "grid", "display_order": 2},
    {"key": "new_arrivals",       "label": "New Arrivals",             "description": "Recently added products from farmers.", "icon": "sparkles", "display_order": 3},
    {"key": "organic_products",   "label": "Organic Products",         "description": "Section showing only certified organic produce.", "icon": "leaf", "display_order": 4},
    {"key": "popular_farmers",    "label": "Popular Farmers",          "description": "Farmer profiles with highest ratings and sales.", "icon": "users", "display_order": 5},
    {"key": "special_offers",     "label": "Special Offers & Deals",   "description": "Products with active discounts.", "icon": "percent", "display_order": 6},
    {"key": "top_rated",          "label": "Top Rated Products",       "description": "Products sorted by average customer rating.", "icon": "thumbs-up", "display_order": 7},
    {"key": "seasonal_produce",   "label": "Seasonal Produce",         "description": "Produce available only in the current season.", "icon": "sun", "display_order": 8},
    {"key": "nearby_farmers",     "label": "Nearby Farmers",           "description": "Farmers located in the customer's district.", "icon": "map-pin", "display_order": 9},
]


@router.get("/sections", summary="List app sections and their visibility (admin)")
async def admin_list_sections(
    admin=Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    from app.models.settings import AppSection

    result = await db.execute(select(AppSection).order_by(AppSection.display_order))
    sections = result.scalars().all()

    if not sections:
        for s in _DEFAULT_SECTIONS:
            db.add(AppSection(id=uuid.uuid4(), **s))
        await db.commit()
        result = await db.execute(select(AppSection).order_by(AppSection.display_order))
        sections = result.scalars().all()

    return [
        {
            "id": str(s.id),
            "key": s.key,
            "label": s.label,
            "description": s.description,
            "is_visible": s.is_visible,
            "display_order": s.display_order,
            "icon": s.icon,
        }
        for s in sections
    ]


@router.patch("/sections/{key}", summary="Toggle section visibility (admin)")
async def admin_update_section(
    key: str,
    body: dict,
    admin=Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    from app.models.settings import AppSection

    result = await db.execute(select(AppSection).where(AppSection.key == key))
    section = result.scalar_one_or_none()
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    if "is_visible" in body:
        section.is_visible = bool(body["is_visible"])
    if "display_order" in body:
        section.display_order = int(body["display_order"])

    await db.commit()
    return {"key": section.key, "is_visible": section.is_visible, "display_order": section.display_order}


@router.get("/settings/smtp", summary="Get SMTP settings (password masked)")
async def get_smtp_settings(
    admin=Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    from app.models.settings import SiteSetting
    from app.utils.otp import SMTP_PASSWORD_MASK

    keys = ["smtp_host", "smtp_port", "smtp_user", "smtp_password", "smtp_from_name"]
    result = await db.execute(select(SiteSetting).where(SiteSetting.key.in_(keys)))
    rows = {row.key: row.value for row in result.scalars().all()}

    return {
        "smtp_host":      rows.get("smtp_host")      or settings.SMTP_HOST,
        "smtp_port":      int(rows.get("smtp_port")  or settings.SMTP_PORT),
        "smtp_user":      rows.get("smtp_user")      or settings.SMTP_USER,
        "smtp_password":  SMTP_PASSWORD_MASK if rows.get("smtp_password") or settings.SMTP_PASSWORD else "",
        "smtp_from_name": rows.get("smtp_from_name") or settings.SMTP_FROM_NAME,
    }


@router.patch("/settings/smtp", summary="Save SMTP settings")
async def update_smtp_settings(
    body: dict,
    admin=Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    from app.models.settings import SiteSetting
    from app.utils.otp import SMTP_PASSWORD_MASK

    allowed = {"smtp_host", "smtp_port", "smtp_user", "smtp_password", "smtp_from_name"}
    for key, value in body.items():
        if key not in allowed:
            continue
        # Don't overwrite password if the masked placeholder is sent back
        if key == "smtp_password" and value == SMTP_PASSWORD_MASK:
            continue
        result = await db.execute(select(SiteSetting).where(SiteSetting.key == key))
        row = result.scalar_one_or_none()
        if row:
            row.value = str(value)
        else:
            db.add(SiteSetting(key=key, value=str(value)))

    await db.commit()
    return {"message": "SMTP settings saved"}


@router.get("/settings/sms", summary="Get SMS/WhatsApp OTP settings (API key masked)")
async def get_sms_settings(
    admin=Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    from app.models.settings import SiteSetting
    from app.utils.otp import API_KEY_MASK

    keys = ["fast2sms_api_key", "otp_provider"]
    result = await db.execute(select(SiteSetting).where(SiteSetting.key.in_(keys)))
    rows = {row.key: row.value for row in result.scalars().all()}

    has_key = bool(rows.get("fast2sms_api_key") or settings.FAST2SMS_API_KEY)
    return {
        "fast2sms_api_key": API_KEY_MASK if has_key else "",
        "otp_provider": rows.get("otp_provider") or "sms",
    }


@router.patch("/settings/sms", summary="Save SMS/WhatsApp OTP settings")
async def update_sms_settings(
    body: dict,
    admin=Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    from app.models.settings import SiteSetting
    from app.utils.otp import API_KEY_MASK

    allowed = {"fast2sms_api_key", "otp_provider"}
    valid_providers = {"sms", "whatsapp"}

    for key, value in body.items():
        if key not in allowed:
            continue
        if key == "fast2sms_api_key" and value == API_KEY_MASK:
            continue
        if key == "otp_provider" and value not in valid_providers:
            raise HTTPException(status_code=400, detail="Invalid provider. Must be 'sms' or 'whatsapp'.")
        result = await db.execute(select(SiteSetting).where(SiteSetting.key == key))
        row = result.scalar_one_or_none()
        if row:
            row.value = str(value)
        else:
            db.add(SiteSetting(key=key, value=str(value)))

    await db.commit()
    return {"message": "SMS settings saved"}


@router.get("/orders", summary="All orders")
async def get_all_orders(
    order_status: Optional[str] = None,
    payment_status: Optional[str] = None,
    farmer_id: Optional[uuid.UUID] = None,
    customer_id: Optional[uuid.UUID] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    admin=Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    """Get all orders with filters. Admin only."""
    result = await admin_service.get_all_orders(
        db, order_status, payment_status, farmer_id, customer_id, date_from, date_to, page, page_size
    )
    return {
        "items": [
            {
                "id": str(o.id),
                "customer": o.customer.name if o.customer else "Unknown",
                "status": o.status,
                "payment_method": o.payment_method,
                "payment_status": o.payment_status,
                "total_amount": float(o.total_amount),
                "item_count": len(o.items),
                "created_at": o.created_at.isoformat(),
            }
            for o in result["items"]
        ],
        "total": result["total"],
        "page": result["page"],
        "pages": result["pages"],
    }


@router.patch("/orders/{order_id}/status", summary="Admin update order status")
async def admin_update_order_status(
    order_id: uuid.UUID,
    body: AdminOrderStatusUpdate,
    admin=Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    """Manually update order status. Admin only."""
    from datetime import datetime
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    order.status = body.status
    if body.reason:
        order.cancelled_reason = body.reason
    order.updated_at = datetime.utcnow()
    await db.flush()

    return {"message": "Order status updated", "order_id": str(order_id), "status": order.status}


@router.post("/orders/{order_id}/refund", summary="Issue refund")
async def issue_order_refund(
    order_id: uuid.UUID,
    admin=Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    """Issue a Razorpay refund for an order. Admin only."""
    razorpay_client = get_razorpay_client()
    result = await admin_service.issue_refund(order_id, db, razorpay_client)
    return result


@router.get("/analytics", summary="Platform analytics")
async def get_analytics(
    period: str = Query("month", description="Period: day, week, month, year"),
    admin=Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    """Get platform analytics for a given period. Admin only."""
    if period not in ("day", "week", "month", "year"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid period")
    return await admin_service.get_analytics(period, db)


@router.post("/promos", response_model=PromoCodeOut, status_code=201, summary="Create promo code")
async def create_promo(
    body: PromoCodeCreate,
    admin=Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    """Create a new promo code. Admin only."""
    result = await db.execute(select(PromoCode).where(PromoCode.code == body.code))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Promo code already exists",
        )

    from datetime import datetime as dt
    promo = PromoCode(
        id=uuid.uuid4(),
        code=body.code,
        discount_type=body.discount_type,
        discount_value=body.discount_value,
        min_order_amount=body.min_order_amount,
        max_uses=body.max_uses,
        expires_at=body.expires_at,
        is_active=True,
        used_count=0,
        created_at=dt.utcnow(),
    )
    db.add(promo)
    await db.flush()
    await db.refresh(promo)
    return promo


@router.get("/promos", response_model=list[PromoCodeOut], summary="List promo codes")
async def list_promos(
    admin=Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    """List all promo codes. Admin only."""
    result = await db.execute(select(PromoCode).order_by(PromoCode.created_at.desc()))
    return result.scalars().all()


@router.put("/promos/{promo_id}", response_model=PromoCodeOut, summary="Edit promo code")
async def update_promo(
    promo_id: uuid.UUID,
    body: PromoCodeCreate,
    admin=Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    """Update a promo code. Admin only."""
    result = await db.execute(select(PromoCode).where(PromoCode.id == promo_id))
    promo = result.scalar_one_or_none()
    if not promo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Promo code not found")

    promo.code = body.code
    promo.discount_type = body.discount_type
    promo.discount_value = body.discount_value
    promo.min_order_amount = body.min_order_amount
    promo.max_uses = body.max_uses
    promo.expires_at = body.expires_at
    await db.flush()
    await db.refresh(promo)
    return promo


@router.post("/sync-product-stock", summary="Backfill Product.stock from FarmerProductListing")
async def sync_product_stock_bulk(
    admin=Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    """One-time (idempotent) sync: recalculate every Product's stock and status
    from its FarmerProductListing entries. Safe to run multiple times."""
    product_ids_result = await db.execute(select(Product.id))
    product_ids = product_ids_result.scalars().all()
    for pid in product_ids:
        await _sync_product_stock(pid, db)
    await db.commit()
    return {"synced": len(product_ids)}


@router.post("/seed-test-data", summary="Seed test farmers and products")
async def seed_test_data(
    admin=Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    """Idempotently create test farmers and products for development. Admin only."""
    from datetime import date, datetime as dt
    from decimal import Decimal
    from app.models.user import FarmerProfile
    from app.models.product import Product as ProductModel, Category
    from app.core.security import hash_password

    created = {"categories": 0, "farmers": 0, "products": 0}

    # ── Categories (idempotent by slug) ──
    categories_data = [
        {"name_en": "Vegetables", "name_mr": "भाजीपाला", "slug": "vegetables"},
        {"name_en": "Fruits",     "name_mr": "फळे",       "slug": "fruits"},
        {"name_en": "Grains & Pulses", "name_mr": "धान्य व कडधान्य", "slug": "grains"},
        {"name_en": "Dairy",      "name_mr": "दुग्धजन्य", "slug": "dairy"},
        {"name_en": "Spices & Herbs", "name_mr": "मसाले व औषधी", "slug": "spices"},
        {"name_en": "Other",      "name_mr": "इतर",        "slug": "other"},
    ]
    category_map: dict[str, Category] = {}
    for c in categories_data:
        res = await db.execute(select(Category).where(Category.slug == c["slug"]))
        cat = res.scalar_one_or_none()
        if not cat:
            cat = Category(id=uuid.uuid4(), name_en=c["name_en"], name_mr=c["name_mr"], slug=c["slug"], is_active=True)
            db.add(cat)
            created["categories"] += 1
        category_map[c["slug"]] = cat
    await db.flush()

    # ── Farmers (idempotent by phone) ──
    async def get_or_create_farmer(phone, email, name, district, taluka, village, produce_types, bio):
        res = await db.execute(select(User).where(User.phone == phone))
        u = res.scalar_one_or_none()
        if u:
            res2 = await db.execute(select(FarmerProfile).where(FarmerProfile.user_id == u.id))
            profile = res2.scalar_one_or_none()
            return u, profile, False
        uid = uuid.uuid4()
        u = User(id=uid, phone=phone, email=email, name=name, role="farmer",
                 hashed_password=hash_password("Farmer@123"), is_active=True,
                 language_pref="mr", created_at=dt.utcnow(), updated_at=dt.utcnow())
        db.add(u)
        p = FarmerProfile(id=uuid.uuid4(), user_id=uid, district=district, taluka=taluka,
                          village=village, farm_size_acres=5.0, produce_types=produce_types,
                          status="APPROVED", bio=bio, rating=4.5, total_ratings=10,
                          approved_at=dt.utcnow(), created_at=dt.utcnow(), updated_at=dt.utcnow())
        db.add(p)
        return u, p, True

    f1, _, f1_new = await get_or_create_farmer(
        "9876543210", "rajesh.patil@farm.in", "Rajesh Patil",
        "Nashik", "Niphad", "Pimpalgaon Baswant",
        ["Grapes", "Onion", "Tomato"], "Organic farmer from Nashik"
    )
    f2, _, f2_new = await get_or_create_farmer(
        "9765432109", "sunita.jadhav@farm.in", "Sunita Jadhav",
        "Pune", "Khed", "Rajgurunagar",
        ["Spinach", "Fenugreek", "Chilli"], "Vegetable farmer near Pune"
    )
    if f1_new: created["farmers"] += 1
    if f2_new: created["farmers"] += 1
    await db.flush()

    # ── Products (idempotent — skip if farmer already has products) ──
    products_data = [
        (f1.id, "vegetables", "Fresh Onion", "ताजी कांदा", 40, "kg", 500, True),
        (f1.id, "vegetables", "Tomato", "टोमॅटो", 30, "kg", 200, False),
        (f1.id, "vegetables", "Fresh Garlic", "ताजी लसूण", 120, "kg", 50, True),
        (f1.id, "fruits",     "Thompson Seedless Grapes", "थॉम्पसन द्राक्षे", 80, "kg", 100, True),
        (f1.id, "grains",     "Wheat (Lokwan)", "गहू (लोकवन)", 35, "kg", 1000, False),
        (f2.id, "vegetables", "Spinach (Palak)", "पालक", 25, "bundle", 80, True),
        (f2.id, "vegetables", "Fenugreek Leaves (Methi)", "मेथी", 20, "bundle", 60, True),
        (f2.id, "vegetables", "Green Chilli", "हिरवी मिरची", 50, "kg", 30, True),
        (f2.id, "vegetables", "Okra (Bhindi)", "भेंडी", 60, "kg", 40, False),
        (f2.id, "spices",     "Fresh Ginger", "ताजे आले", 90, "kg", 25, True),
    ]
    for farmer_id, cat_slug, name_en, name_mr, price, unit, stock, is_organic in products_data:
        res = await db.execute(
            select(ProductModel).where(ProductModel.farmer_id == farmer_id, ProductModel.name_en == name_en)
        )
        if res.scalar_one_or_none():
            continue
        product = ProductModel(
            id=uuid.uuid4(), farmer_id=farmer_id, category_id=category_map[cat_slug].id,
            name_en=name_en, name_mr=name_mr,
            description_en=f"Fresh {name_en} from local farms.",
            description_mr=f"ताजे {name_mr} स्थानिक शेतातून.",
            price=Decimal(str(price)), unit=unit, min_order_qty=1, stock=stock,
            is_organic=is_organic, harvest_date=date.today(),
            tags=[name_en.lower()], status="ACTIVE",
            created_at=dt.utcnow(), updated_at=dt.utcnow(),
        )
        db.add(product)
        created["products"] += 1

    await db.commit()
    return {
        "message": "Seed complete",
        "created": created,
        "note": "Existing records were skipped. Farmer login: 9876543210 / 9765432109, password: Farmer@123",
    }


@router.delete("/promos/{promo_id}", summary="Delete promo code")
async def delete_promo(
    promo_id: uuid.UUID,
    admin=Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    """Delete a promo code. Admin only."""
    result = await db.execute(select(PromoCode).where(PromoCode.id == promo_id))
    promo = result.scalar_one_or_none()
    if not promo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Promo code not found")
    await db.delete(promo)
    await db.flush()
    return {"message": "Promo code deleted"}


# ─── FarmerProductListing ──────────────────────────────────────────────────────

@router.get("/farmer-products", summary="List farmer-product mappings")
async def list_farmer_product_mappings(
    farmer_id: Optional[uuid.UUID] = None,
    product_id: Optional[uuid.UUID] = None,
    category: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    admin=Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(FarmerProductListing)
        .options(
            selectinload(FarmerProductListing.farmer),
            selectinload(FarmerProductListing.product).selectinload(Product.category),
            selectinload(FarmerProductListing.product).selectinload(Product.images),
        )
    )
    if farmer_id:
        stmt = stmt.where(FarmerProductListing.farmer_id == farmer_id)
    if product_id:
        stmt = stmt.where(FarmerProductListing.product_id == product_id)
    if category:
        stmt = stmt.join(Product, Product.id == FarmerProductListing.product_id).join(
            Category, Category.id == Product.category_id
        ).where(Category.slug == category)

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar() or 0

    offset = (page - 1) * page_size
    stmt = stmt.order_by(FarmerProductListing.created_at.desc()).offset(offset).limit(page_size)
    listings = (await db.execute(stmt)).scalars().all()

    return {
        "items": [_serialize_listing(l) for l in listings],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.post("/farmer-products", summary="Create farmer-product mapping")
async def create_farmer_product_mapping(
    body: dict,
    admin=Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    try:
        farmer_id = uuid.UUID(str(body.get("farmer_id", "")))
        product_id = uuid.UUID(str(body.get("product_id", "")))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid farmer_id or product_id")

    farmer = (await db.execute(select(User).where(User.id == farmer_id, User.role == "farmer"))).scalar_one_or_none()
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")

    product = (await db.execute(select(Product).where(Product.id == product_id))).scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    existing = (await db.execute(
        select(FarmerProductListing).where(
            FarmerProductListing.farmer_id == farmer_id,
            FarmerProductListing.product_id == product_id,
        )
    )).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="This farmer already has a listing for this product")

    stock = max(0, int(body.get("stock", 0)))
    price_override_raw = body.get("price_override")
    from decimal import Decimal as D
    price_override = D(str(price_override_raw)) if price_override_raw else None

    listing = FarmerProductListing(
        id=uuid.uuid4(),
        farmer_id=farmer_id,
        product_id=product_id,
        stock=stock,
        price_override=price_override,
        status="OUT_OF_STOCK" if stock == 0 else "ACTIVE",
    )
    db.add(listing)
    await db.flush()
    await _sync_product_stock(product_id, db)
    await db.commit()

    result = await db.execute(
        select(FarmerProductListing)
        .options(
            selectinload(FarmerProductListing.farmer),
            selectinload(FarmerProductListing.product).selectinload(Product.category),
            selectinload(FarmerProductListing.product).selectinload(Product.images),
        )
        .where(FarmerProductListing.id == listing.id)
    )
    return _serialize_listing(result.scalar_one())


@router.patch("/farmer-products/{listing_id}", summary="Update farmer-product listing")
async def update_farmer_product_mapping(
    listing_id: uuid.UUID,
    body: dict,
    admin=Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(FarmerProductListing)
        .options(
            selectinload(FarmerProductListing.farmer),
            selectinload(FarmerProductListing.product).selectinload(Product.category),
            selectinload(FarmerProductListing.product).selectinload(Product.images),
        )
        .where(FarmerProductListing.id == listing_id)
    )
    listing = result.scalar_one_or_none()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")

    from decimal import Decimal as D
    from datetime import datetime as dt
    if "stock" in body:
        listing.stock = max(0, int(body["stock"]))
        if listing.stock == 0:
            listing.status = "OUT_OF_STOCK"
        elif listing.status == "OUT_OF_STOCK":
            listing.status = "ACTIVE"
    if "price_override" in body:
        raw = body["price_override"]
        listing.price_override = D(str(raw)) if raw else None
    if "status" in body and body["status"] in ("ACTIVE", "INACTIVE", "OUT_OF_STOCK"):
        listing.status = body["status"]
    listing.updated_at = dt.utcnow()
    await db.flush()
    await _sync_product_stock(listing.product_id, db)
    await db.commit()

    result = await db.execute(
        select(FarmerProductListing)
        .options(
            selectinload(FarmerProductListing.farmer),
            selectinload(FarmerProductListing.product).selectinload(Product.category),
            selectinload(FarmerProductListing.product).selectinload(Product.images),
        )
        .where(FarmerProductListing.id == listing_id)
    )
    return _serialize_listing(result.scalar_one())


@router.delete("/farmer-products/{listing_id}", summary="Delete farmer-product mapping")
async def delete_farmer_product_mapping(
    listing_id: uuid.UUID,
    admin=Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(FarmerProductListing).where(FarmerProductListing.id == listing_id))
    listing = result.scalar_one_or_none()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    product_id = listing.product_id
    await db.delete(listing)
    await db.flush()
    await _sync_product_stock(product_id, db)
    await db.commit()
    return {"message": "Listing deleted"}


async def _sync_product_stock(product_id: uuid.UUID, db: AsyncSession) -> None:
    """Recalculate Product.stock as the sum of all ACTIVE FarmerProductListing stocks.
    Also promotes OUT_OF_STOCK → ACTIVE (or demotes ACTIVE → OUT_OF_STOCK) accordingly.
    INACTIVE products are never auto-activated."""
    total_result = await db.execute(
        select(func.coalesce(func.sum(FarmerProductListing.stock), 0))
        .where(
            FarmerProductListing.product_id == product_id,
            FarmerProductListing.status == "ACTIVE",
        )
    )
    total_stock = int(total_result.scalar())

    product_result = await db.execute(select(Product).where(Product.id == product_id))
    product = product_result.scalar_one_or_none()
    if not product:
        return

    product.stock = total_stock
    if total_stock > 0 and product.status == "OUT_OF_STOCK":
        product.status = "ACTIVE"
    elif total_stock == 0 and product.status == "ACTIVE":
        product.status = "OUT_OF_STOCK"


def _serialize_listing(l: FarmerProductListing) -> dict:
    p = l.product
    primary_image = None
    if p and p.images:
        primary = next((img for img in p.images if img.is_primary), p.images[0] if p.images else None)
        if primary:
            primary_image = primary.image_url
    return {
        "id": str(l.id),
        "farmer_id": str(l.farmer_id),
        "farmer_name": l.farmer.name if l.farmer else "",
        "product_id": str(l.product_id),
        "product_name_en": p.name_en if p else "",
        "product_name_mr": p.name_mr if p else "",
        "category_slug": p.category.slug if p and p.category else "",
        "category_name": p.category.name_en if p and p.category else "",
        "primary_image": primary_image,
        "stock": l.stock,
        "price_override": float(l.price_override) if l.price_override else None,
        "base_price": float(p.price) if p else 0,
        "unit": p.unit if p else "",
        "status": l.status,
        "created_at": l.created_at.isoformat(),
        "updated_at": l.updated_at.isoformat(),
    }
