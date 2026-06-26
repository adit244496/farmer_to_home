import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import require_role
from app.models.product import Category
from app.schemas.product import CategoryOut, CategoryCreate

router = APIRouter(prefix="/categories", tags=["Categories"])


@router.get("/", response_model=list[CategoryOut], summary="List all active categories")
async def list_categories(db: AsyncSession = Depends(get_db)):
    """Get all active product categories."""
    result = await db.execute(
        select(Category).where(Category.is_active == True).order_by(Category.name_en)
    )
    return result.scalars().all()


@router.post("/", response_model=CategoryOut, status_code=status.HTTP_201_CREATED,
             summary="Create category (admin only)")
async def create_category(
    body: CategoryCreate,
    db: AsyncSession = Depends(get_db),
    admin=Depends(require_role("admin")),
):
    """Create a new product category. Admin only."""
    # Check slug uniqueness
    result = await db.execute(select(Category).where(Category.slug == body.slug))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Category with this slug already exists",
        )

    category = Category(
        id=uuid.uuid4(),
        name_en=body.name_en,
        name_mr=body.name_mr,
        slug=body.slug,
        icon_url=body.icon_url,
        is_active=True,
    )
    db.add(category)
    await db.flush()
    await db.refresh(category)
    return category


@router.put("/{category_id}", response_model=CategoryOut, summary="Update category (admin only)")
async def update_category(
    category_id: uuid.UUID,
    body: CategoryCreate,
    db: AsyncSession = Depends(get_db),
    admin=Depends(require_role("admin")),
):
    """Update a category. Admin only."""
    result = await db.execute(select(Category).where(Category.id == category_id))
    category = result.scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

    category.name_en = body.name_en
    category.name_mr = body.name_mr
    category.slug = body.slug
    category.icon_url = body.icon_url
    await db.flush()
    await db.refresh(category)
    return category


@router.delete("/{category_id}", summary="Deactivate category (admin only)")
async def deactivate_category(
    category_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    admin=Depends(require_role("admin")),
):
    """Soft-delete a category by marking it inactive. Admin only."""
    result = await db.execute(select(Category).where(Category.id == category_id))
    category = result.scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

    category.is_active = False
    await db.flush()
    return {"message": "Category deactivated successfully"}
