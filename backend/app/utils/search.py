from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, select, or_, and_, func
from sqlalchemy.orm import selectinload

# Transliteration table: common Marathi/Hindi words → English product names
TRANSLITERATION_MAP = {
    # ── Tomato ──────────────────────────────────────────────────────────────────
    "टोमॅटो": "tomato", "टोमाटो": "tomato",
    "tamatar": "tomato", "tamato": "tomato", "tomatoe": "tomato",
    # ── Mango ───────────────────────────────────────────────────────────────────
    "आंबा": "mango", "आम": "mango",
    "aam": "mango", "aamba": "mango", "aab": "mango", "keri": "mango",
    # ── Potato ──────────────────────────────────────────────────────────────────
    "बटाटा": "potato", "आलू": "potato",
    "aloo": "potato", "aaloo": "potato", "batata": "potato", "alu": "potato",
    # ── Onion ───────────────────────────────────────────────────────────────────
    "कांदा": "onion", "प्याज": "onion", "प्याजा": "onion",
    "pyaz": "onion", "kanda": "onion", "pyaaz": "onion", "piaz": "onion",
    # ── Garlic ──────────────────────────────────────────────────────────────────
    "लसूण": "garlic", "लहसुन": "garlic",
    "lehsun": "garlic", "lasun": "garlic", "lahsun": "garlic", "lasan": "garlic",
    # ── Ginger ──────────────────────────────────────────────────────────────────
    "आले": "ginger", "अदरक": "ginger",
    "adrak": "ginger", "aale": "ginger", "adarak": "ginger",
    # ── Fenugreek ───────────────────────────────────────────────────────────────
    "मेथी": "fenugreek",
    "methi": "fenugreek", "methya": "fenugreek",
    # ── Spinach ─────────────────────────────────────────────────────────────────
    "पालक": "spinach",
    "palak": "spinach",
    # ── Chilli ──────────────────────────────────────────────────────────────────
    "मिरची": "chilli", "मिर्च": "chilli", "हरी मिर्च": "chilli",
    "mirch": "chilli", "mirchi": "chilli", "chili": "chilli",
    "hari mirch": "chilli", "green chilli": "chilli",
    # ── Okra / Lady's Finger ────────────────────────────────────────────────────
    "भेंडी": "okra", "भिंडी": "okra",
    "bhindi": "okra", "bendi": "okra", "bhendi": "okra", "ladyfinger": "okra",
    # ── Eggplant / Brinjal ──────────────────────────────────────────────────────
    "वांगी": "eggplant", "वांगे": "eggplant", "बैंगन": "eggplant",
    "baingan": "eggplant", "vangi": "eggplant", "brinjal": "eggplant",
    "baingun": "eggplant",
    # ── Milk ────────────────────────────────────────────────────────────────────
    "दूध": "milk",
    "dudh": "milk", "doodh": "milk",
    # ── Rice ────────────────────────────────────────────────────────────────────
    "तांदूळ": "rice", "चावल": "rice",
    "chawal": "rice", "tandool": "rice", "tandul": "rice", "chaval": "rice",
    # ── Wheat ───────────────────────────────────────────────────────────────────
    "गहू": "wheat", "गेहूं": "wheat",
    "gehun": "wheat", "gahu": "wheat", "gehu": "wheat",
    # ── Cauliflower ─────────────────────────────────────────────────────────────
    "फुलकोबी": "cauliflower", "फ्लॉवर": "cauliflower", "फूल गोभी": "cauliflower",
    "phool gobi": "cauliflower", "gobi": "cauliflower", "fulkobi": "cauliflower",
    # ── Cabbage ─────────────────────────────────────────────────────────────────
    "कोबी": "cabbage", "पत्ता गोभी": "cabbage",
    "kobi": "cabbage", "patta gobi": "cabbage",
    # ── Carrot ──────────────────────────────────────────────────────────────────
    "गाजर": "carrot",
    "gajar": "carrot",
    # ── Banana ──────────────────────────────────────────────────────────────────
    "केळ": "banana", "केला": "banana",
    "kela": "banana", "kele": "banana",
    # ── Cucumber ────────────────────────────────────────────────────────────────
    "काकडी": "cucumber", "खीरा": "cucumber", "ककडी": "cucumber",
    "kakdi": "cucumber", "kheera": "cucumber", "khira": "cucumber",
    # ── Bitter Gourd ────────────────────────────────────────────────────────────
    "कारले": "bitter gourd", "करेला": "bitter gourd",
    "karela": "bitter gourd", "karle": "bitter gourd",
    # ── Bottle Gourd ────────────────────────────────────────────────────────────
    "दुधी": "bottle gourd", "लौकी": "bottle gourd",
    "dudhi": "bottle gourd", "lauki": "bottle gourd", "loki": "bottle gourd",
    # ── Capsicum ────────────────────────────────────────────────────────────────
    "ढोबळी मिर्ची": "capsicum", "शिमला मिर्च": "capsicum",
    "shimla mirch": "capsicum", "dhobali mirchi": "capsicum",
    # ── Peas ────────────────────────────────────────────────────────────────────
    "मटार": "peas", "मटर": "peas", "वाटाणे": "peas",
    "matar": "peas", "mattar": "peas", "watane": "peas",
    # ── Coriander ───────────────────────────────────────────────────────────────
    "कोथिंबीर": "coriander", "धनिया": "coriander",
    "kothimbir": "coriander", "dhaniya": "coriander", "dhania": "coriander",
    # ── Mint ────────────────────────────────────────────────────────────────────
    "पुदिना": "mint",
    "pudina": "mint",
    # ── Apple ───────────────────────────────────────────────────────────────────
    "सफरचंद": "apple", "सेब": "apple",
    "safarchand": "apple", "seb": "apple",
    # ── Orange ──────────────────────────────────────────────────────────────────
    "संत्रा": "orange", "संतरा": "orange",
    "santra": "orange", "narangi": "orange",
    # ── Lemon ───────────────────────────────────────────────────────────────────
    "लिंबू": "lemon", "नींबू": "lemon",
    "limbu": "lemon", "nimbu": "lemon",
    # ── Papaya ──────────────────────────────────────────────────────────────────
    "पपई": "papaya", "पपीता": "papaya",
    "papai": "papaya", "papita": "papaya",
    # ── Grapes ──────────────────────────────────────────────────────────────────
    "द्राक्ष": "grapes", "अंगूर": "grapes",
    "draksh": "grapes", "angur": "grapes",
    # ── Watermelon ──────────────────────────────────────────────────────────────
    "टरबूज": "watermelon", "तरबूज": "watermelon",
    "tarbooj": "watermelon", "tarbooz": "watermelon",
    # ── Pomegranate ─────────────────────────────────────────────────────────────
    "डाळिंब": "pomegranate", "अनार": "pomegranate",
    "dalimb": "pomegranate", "anar": "pomegranate",
    # ── Pumpkin ─────────────────────────────────────────────────────────────────
    "भोपळा": "pumpkin", "कद्दू": "pumpkin",
    "bhopla": "pumpkin", "kaddu": "pumpkin",
    # ── Corn ────────────────────────────────────────────────────────────────────
    "मका": "corn", "मक्का": "corn",
    "maka": "corn", "makka": "corn", "maize": "corn",
    # ── Coconut ─────────────────────────────────────────────────────────────────
    "नारळ": "coconut", "नारियल": "coconut",
    "naral": "coconut", "nariyal": "coconut",
    # ── Mustard ─────────────────────────────────────────────────────────────────
    "मोहरी": "mustard", "सरसों": "mustard",
    "mohri": "mustard", "sarson": "mustard",
    # ── French Beans ────────────────────────────────────────────────────────────
    "फरसबी": "beans", "घेवडा": "beans",
    "farsabi": "beans", "ghevda": "beans",
    # ── Drumstick ───────────────────────────────────────────────────────────────
    "शेवगा": "drumstick", "सहजन": "drumstick",
    "shevga": "drumstick", "sahjan": "drumstick", "moringa": "drumstick",
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
    from app.models.product import Product, ProductImage, FarmerProductListing
    from app.models.user import User
    import uuid
    from decimal import Decimal

    # Normalize search query
    normalized_q = normalize_search_query(q) if q else None

    # Build base query — both joins are LEFT so admin-created products
    # with no farmer_id are still included.
    stmt = (
        select(Product)
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

    if in_stock:
        # Accept products that have direct stock OR have at least one active listing with stock.
        # This handles both the legacy direct-stock model and the FarmerProductListing model.
        has_listing_stock = (
            select(FarmerProductListing.id)
            .where(
                FarmerProductListing.product_id == Product.id,
                FarmerProductListing.status == "ACTIVE",
                FarmerProductListing.stock > 0,
            )
            .exists()
        )
        filters.append(or_(Product.stock > 0, has_listing_stock))

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
