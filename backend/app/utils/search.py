from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, select, or_, and_, func
from sqlalchemy.orm import selectinload

# Transliteration table: common Marathi/Hindi words → English product names
TRANSLITERATION_MAP = {
    # Tomato
    "टोमॅटो": "tomato",
    "tamatar": "tomato",
    "tamato": "tomato",
    "tomatoe": "tomato",
    # Mango
    "आंबा": "mango",
    "aam": "mango",
    "aamba": "mango",
    "aab": "mango",
    # Potato
    "बटाटा": "potato",
    "aloo": "potato",
    "aaloo": "potato",
    "batata": "potato",
    # Onion
    "कांदा": "onion",
    "pyaz": "onion",
    "kanda": "onion",
    "pyaaz": "onion",
    # Garlic
    "लसूण": "garlic",
    "lehsun": "garlic",
    "lasun": "garlic",
    "lahsun": "garlic",
    # Ginger
    "आले": "ginger",
    "adrak": "ginger",
    "aale": "ginger",
    # Fenugreek
    "मेथी": "fenugreek",
    "methi": "fenugreek",
    # Spinach
    "पालक": "spinach",
    "palak": "spinach",
    # Chilli
    "मिरची": "chilli",
    "mirch": "chilli",
    "mirchi": "chilli",
    "chili": "chilli",
    # Okra / Lady's Finger
    "भेंडी": "okra",
    "bhindi": "okra",
    "bendi": "okra",
    "bhendi": "okra",
    "ladyfinger": "okra",
    # Eggplant / Brinjal
    "वांगी": "eggplant",
    "baingan": "eggplant",
    "vangi": "eggplant",
    "brinjal": "eggplant",
    # Milk
    "दूध": "milk",
    "dudh": "milk",
    # Rice
    "तांदूळ": "rice",
    "chawal": "rice",
    "tandool": "rice",
    # Wheat
    "गहू": "wheat",
    "gehun": "wheat",
    "gahu": "wheat",
    # Cauliflower
    "फ्लॉवर": "cauliflower",
    "phool gobi": "cauliflower",
    "gobi": "cauliflower",
    # Cabbage
    "कोबी": "cabbage",
    "kobi": "cabbage",
    "patta gobi": "cabbage",
    # Carrot
    "गाजर": "carrot",
    "gajar": "carrot",
    # Banana
    "केळ": "banana",
    "kela": "banana",
    "kele": "banana",
}


def normalize_search_query(q: str) -> str:
    """
    Normalize search query by applying transliteration mappings.
    Returns the translated English term if found, otherwise the original query.
    """
    q_lower = q.lower().strip()
    if q_lower in TRANSLITERATION_MAP:
        return TRANSLITERATION_MAP[q_lower]
    # Check if any key is a substring
    for key, value in TRANSLITERATION_MAP.items():
        if key in q or key in q_lower:
            return value
    return q


async def build_search_query(
    q: Optional[str],
    session: AsyncSession,
    category_id=None,
    farmer_id=None,
    min_price=None,
    max_price=None,
    is_organic=None,
    unit=None,
    district=None,
    in_stock: bool = True,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    page: int = 1,
    page_size: int = 20,
):
    """
    Build and execute a comprehensive product search query.
    Uses pg_trgm similarity for fuzzy matching and ts_rank for full-text search.
    """
    from app.models.product import Product, ProductImage
    from app.models.user import User, FarmerProfile
    import uuid
    from decimal import Decimal

    # Normalize search query
    normalized_q = normalize_search_query(q) if q else None

    # Build base query
    stmt = (
        select(Product)
        .join(User, Product.farmer_id == User.id)
        .outerjoin(FarmerProfile, FarmerProfile.user_id == User.id)
        .options(
            selectinload(Product.images),
            selectinload(Product.farmer).selectinload(User.farmer_profile),
            selectinload(Product.category),
            selectinload(Product.discount),
        )
        .where(Product.status == "ACTIVE")
    )

    filters = []

    # Text search using pg_trgm + tsvector
    if normalized_q:
        search_filter = or_(
            func.similarity(Product.name_en, normalized_q) > 0.2,
            func.similarity(Product.name_mr, normalized_q) > 0.2,
            Product.name_en.ilike(f"%{normalized_q}%"),
            Product.name_mr.ilike(f"%{normalized_q}%"),
            Product.description_en.ilike(f"%{normalized_q}%"),
        )
        filters.append(search_filter)

    if category_id:
        filters.append(Product.category_id == category_id)

    if farmer_id:
        filters.append(Product.farmer_id == farmer_id)

    if min_price is not None:
        filters.append(Product.price >= min_price)

    if max_price is not None:
        filters.append(Product.price <= max_price)

    if is_organic is not None:
        filters.append(Product.is_organic == is_organic)

    if unit:
        filters.append(Product.unit == unit)

    if district:
        filters.append(FarmerProfile.district.ilike(f"%{district}%"))

    if in_stock:
        filters.append(Product.stock > 0)

    # Only approved farmers
    filters.append(FarmerProfile.status == "APPROVED")

    if filters:
        stmt = stmt.where(and_(*filters))

    # Count total
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total_result = await session.execute(count_stmt)
    total = total_result.scalar() or 0

    # Sort
    sort_col = getattr(Product, sort_by, Product.created_at)
    if sort_order == "asc":
        stmt = stmt.order_by(sort_col.asc())
    else:
        stmt = stmt.order_by(sort_col.desc())

    # Pagination
    offset = (page - 1) * page_size
    stmt = stmt.offset(offset).limit(page_size)

    result = await session.execute(stmt)
    products = result.scalars().all()

    return products, total
