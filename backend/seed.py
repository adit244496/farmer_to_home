"""
Seed script for Farmer-to-Home platform.
Creates (skips if already exists):
  - 1 admin user (email: admin@farmertohome.in, password: Admin@123)
  - 6 sample categories
  - 2 approved sample farmers
  - 10 sample products
"""

import asyncio
import uuid
from datetime import datetime, date
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.core.config import settings
from app.core.security import hash_password
from app.core.database import Base
from app.models import User, FarmerProfile, Category, Product, ProductImage


async def seed():
    engine = create_async_engine(settings.ASYNC_DATABASE_URL, echo=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    AsyncSessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

    async with AsyncSessionLocal() as db:
        print("\n=== Seeding Farmer-to-Home Database ===\n")

        # ─── Admin User ───────────────────────────────────────────────────
        result = await db.execute(select(User).where(User.email == "admin@farmertohome.in"))
        existing_admin = result.scalar_one_or_none()
        if existing_admin:
            print("Admin already exists, skipping.")
        else:
            admin = User(
                id=uuid.uuid4(),
                phone="8796545044",
                email="admin@farmertohome.in",
                name="Platform Admin",
                role="admin",
                hashed_password=hash_password("Admin@123"),
                is_active=True,
                language_pref="en",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            db.add(admin)
            await db.flush()
            print(f"Created admin: email=admin@farmertohome.in, password=Admin@123, id={admin.id}")

        # ─── Categories ───────────────────────────────────────────────────
        categories_data = [
            {"name_en": "Vegetables", "name_mr": "भाजीपाला", "slug": "vegetables"},
            {"name_en": "Fruits", "name_mr": "फळे", "slug": "fruits"},
            {"name_en": "Grains & Pulses", "name_mr": "धान्य व कडधान्य", "slug": "grains"},
            {"name_en": "Dairy", "name_mr": "दुग्धजन्य", "slug": "dairy"},
            {"name_en": "Spices & Herbs", "name_mr": "मसाले व औषधी", "slug": "spices"},
            {"name_en": "Other", "name_mr": "इतर", "slug": "other"},
        ]

        categories = {}
        for cat_data in categories_data:
            result = await db.execute(select(Category).where(Category.slug == cat_data["slug"]))
            existing_cat = result.scalar_one_or_none()
            if existing_cat:
                categories[cat_data["slug"]] = existing_cat
                print(f"Category '{cat_data['name_en']}' already exists, skipping.")
            else:
                cat = Category(
                    id=uuid.uuid4(),
                    name_en=cat_data["name_en"],
                    name_mr=cat_data["name_mr"],
                    slug=cat_data["slug"],
                    is_active=True,
                )
                db.add(cat)
                categories[cat_data["slug"]] = cat
                print(f"Created category: {cat_data['name_en']} ({cat_data['name_mr']})")

        await db.flush()

        # ─── Farmer 1 ─────────────────────────────────────────────────────
        result = await db.execute(select(User).where(User.phone == "9876543210"))
        existing_farmer1 = result.scalar_one_or_none()
        farmer1_created = False
        if existing_farmer1:
            farmer1_id = existing_farmer1.id
            print(f"Farmer 1 (Rajesh Patil) already exists, skipping.")
        else:
            farmer1_id = uuid.uuid4()
            farmer1 = User(
                id=farmer1_id,
                phone="9876543210",
                email="rajesh.patil@farm.in",
                name="Rajesh Patil",
                role="farmer",
                hashed_password=hash_password("Farmer@123"),
                is_active=True,
                language_pref="mr",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            db.add(farmer1)
            farmer1_profile = FarmerProfile(
                id=uuid.uuid4(),
                user_id=farmer1_id,
                district="Nashik",
                taluka="Niphad",
                village="Pimpalgaon Baswant",
                farm_size_acres=5.0,
                produce_types=["Grapes", "Onion", "Tomato", "Garlic"],
                status="APPROVED",
                bio="Organic farmer with 15 years of experience in Nashik district. Specializes in table grapes and onions.",
                farm_description="5-acre farm with drip irrigation system. All produce is grown without chemical pesticides.",
                rating=4.5,
                total_ratings=23,
                approved_at=datetime.utcnow(),
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            db.add(farmer1_profile)
            farmer1_created = True
            print(f"Created farmer 1: Rajesh Patil (Nashik), id={farmer1_id}")

        # ─── Farmer 2 ─────────────────────────────────────────────────────
        result = await db.execute(select(User).where(User.phone == "9765432109"))
        existing_farmer2 = result.scalar_one_or_none()
        farmer2_created = False
        if existing_farmer2:
            farmer2_id = existing_farmer2.id
            print(f"Farmer 2 (Sunita Jadhav) already exists, skipping.")
        else:
            farmer2_id = uuid.uuid4()
            farmer2 = User(
                id=farmer2_id,
                phone="9765432109",
                email="sunita.jadhav@farm.in",
                name="Sunita Jadhav",
                role="farmer",
                hashed_password=hash_password("Farmer@123"),
                is_active=True,
                language_pref="mr",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            db.add(farmer2)
            farmer2_profile = FarmerProfile(
                id=uuid.uuid4(),
                user_id=farmer2_id,
                district="Pune",
                taluka="Khed",
                village="Rajgurunagar",
                farm_size_acres=3.5,
                produce_types=["Spinach", "Fenugreek", "Coriander", "Chilli", "Okra"],
                status="APPROVED",
                bio="Passionate organic vegetable farmer near Pune. Delivers fresh produce daily to market.",
                farm_description="3.5-acre mixed vegetable farm with natural composting and pest management.",
                rating=4.8,
                total_ratings=41,
                approved_at=datetime.utcnow(),
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            db.add(farmer2_profile)
            farmer2_created = True
            print(f"Created farmer 2: Sunita Jadhav (Pune), id={farmer2_id}")

        await db.flush()

        # ─── Products (only for newly created farmers) ────────────────────
        products_data = [
            # Farmer 1 products (Nashik)
            {
                "farmer_id": farmer1_id,
                "farmer_created": farmer1_created,
                "category": "vegetables",
                "name_en": "Fresh Onion",
                "name_mr": "ताजी कांदा",
                "description_en": "Premium quality red onions from Nashik. Freshly harvested.",
                "description_mr": "नाशिकमधील उत्कृष्ट दर्जाचा लाल कांदा. नुकताच काढलेला.",
                "price": Decimal("40.00"),
                "unit": "kg",
                "stock": 500,
                "is_organic": True,
                "harvest_date": date.today(),
                "tags": ["onion", "kanda", "pyaz", "nashik"],
            },
            {
                "farmer_id": farmer1_id,
                "farmer_created": farmer1_created,
                "category": "vegetables",
                "name_en": "Tomato",
                "name_mr": "टोमॅटो",
                "description_en": "Juicy red tomatoes, perfect for cooking and salads.",
                "description_mr": "रसाळ लाल टोमॅटो, स्वयंपाक आणि सॅलडसाठी उत्तम.",
                "price": Decimal("30.00"),
                "unit": "kg",
                "stock": 200,
                "is_organic": False,
                "harvest_date": date.today(),
                "tags": ["tomato", "tamatar", "टोमॅटो"],
            },
            {
                "farmer_id": farmer1_id,
                "farmer_created": farmer1_created,
                "category": "vegetables",
                "name_en": "Fresh Garlic",
                "name_mr": "ताजी लसूण",
                "description_en": "Aromatic fresh garlic bulbs from Nashik farms.",
                "description_mr": "नाशिकच्या शेतातील सुगंधी ताजी लसूण.",
                "price": Decimal("120.00"),
                "unit": "kg",
                "stock": 50,
                "is_organic": True,
                "harvest_date": date.today(),
                "tags": ["garlic", "lasun", "lehsun", "लसूण"],
            },
            {
                "farmer_id": farmer1_id,
                "farmer_created": farmer1_created,
                "category": "fruits",
                "name_en": "Thompson Seedless Grapes",
                "name_mr": "थॉम्पसन बीज नसलेली द्राक्षे",
                "description_en": "Sweet seedless green grapes from Nashik vineyards.",
                "description_mr": "नाशिकच्या द्राक्षबागेतील गोड बीज नसलेली हिरवी द्राक्षे.",
                "price": Decimal("80.00"),
                "unit": "kg",
                "stock": 100,
                "is_organic": True,
                "harvest_date": date.today(),
                "tags": ["grapes", "draksha", "द्राक्षे", "nashik"],
            },
            {
                "farmer_id": farmer1_id,
                "farmer_created": farmer1_created,
                "category": "grains",
                "name_en": "Wheat (Lokwan)",
                "name_mr": "गहू (लोकवन)",
                "description_en": "Premium Lokwan wheat variety. Stone-ground quality.",
                "description_mr": "उत्कृष्ट लोकवन गहू. उत्तम दर्जा.",
                "price": Decimal("35.00"),
                "unit": "kg",
                "stock": 1000,
                "is_organic": False,
                "harvest_date": None,
                "tags": ["wheat", "gahu", "lokwan", "गहू"],
            },
            # Farmer 2 products (Pune)
            {
                "farmer_id": farmer2_id,
                "farmer_created": farmer2_created,
                "category": "vegetables",
                "name_en": "Baby Spinach",
                "name_mr": "बेबी पालक",
                "description_en": "Tender baby spinach leaves, washed and ready to cook.",
                "description_mr": "ताजी बेबी पालकाची पाने, धुतलेली व स्वयंपाकासाठी तयार.",
                "price": Decimal("25.00"),
                "unit": "bunch",
                "stock": 100,
                "is_organic": True,
                "harvest_date": date.today(),
                "tags": ["spinach", "palak", "पालक", "greens"],
            },
            {
                "farmer_id": farmer2_id,
                "farmer_created": farmer2_created,
                "category": "vegetables",
                "name_en": "Okra (Bhendi)",
                "name_mr": "भेंडी",
                "description_en": "Fresh tender okra pods. Perfect for bhaji and curries.",
                "description_mr": "ताजी कोवळी भेंडी. भाजी आणि करीसाठी उत्तम.",
                "price": Decimal("40.00"),
                "unit": "kg",
                "stock": 60,
                "is_organic": True,
                "harvest_date": date.today(),
                "tags": ["okra", "bhendi", "bhindi", "भेंडी"],
            },
            {
                "farmer_id": farmer2_id,
                "farmer_created": farmer2_created,
                "category": "vegetables",
                "name_en": "Green Chilli",
                "name_mr": "हिरवी मिरची",
                "description_en": "Fresh spicy green chillies from Pune farms.",
                "description_mr": "पुण्याच्या शेतातील ताज्या तिखट हिरव्या मिरच्या.",
                "price": Decimal("60.00"),
                "unit": "kg",
                "stock": 40,
                "is_organic": False,
                "harvest_date": date.today(),
                "tags": ["chilli", "mirchi", "हिरवी मिरची"],
            },
            {
                "farmer_id": farmer2_id,
                "farmer_created": farmer2_created,
                "category": "spices",
                "name_en": "Fresh Coriander",
                "name_mr": "ताजी कोथिंबीर",
                "description_en": "Fragrant fresh coriander leaves. Essential for garnishing.",
                "description_mr": "सुगंधी ताजी कोथिंबीर. सजावटीसाठी आवश्यक.",
                "price": Decimal("15.00"),
                "unit": "bunch",
                "stock": 150,
                "is_organic": True,
                "harvest_date": date.today(),
                "tags": ["coriander", "kothmibr", "dhaniya", "कोथिंबीर"],
            },
            {
                "farmer_id": farmer2_id,
                "farmer_created": farmer2_created,
                "category": "spices",
                "name_en": "Fresh Ginger",
                "name_mr": "ताजे आले",
                "description_en": "Pungent fresh ginger root from organic farms.",
                "description_mr": "सेंद्रिय शेतातील उग्र ताजे आले.",
                "price": Decimal("90.00"),
                "unit": "kg",
                "stock": 25,
                "is_organic": True,
                "harvest_date": None,
                "tags": ["ginger", "adrak", "aale", "आले"],
            },
        ]

        product_count = 0
        for p_data in products_data:
            if not p_data["farmer_created"]:
                continue
            category = categories[p_data["category"]]
            product = Product(
                id=uuid.uuid4(),
                farmer_id=p_data["farmer_id"],
                category_id=category.id,
                name_en=p_data["name_en"],
                name_mr=p_data["name_mr"],
                description_en=p_data["description_en"],
                description_mr=p_data["description_mr"],
                price=p_data["price"],
                unit=p_data["unit"],
                min_order_qty=1,
                stock=p_data["stock"],
                is_organic=p_data["is_organic"],
                harvest_date=p_data["harvest_date"],
                tags=p_data["tags"],
                status="ACTIVE",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            db.add(product)
            product_count += 1
            print(f"Created product: {p_data['name_en']} @ ₹{p_data['price']}/{p_data['unit']}")

        await db.commit()

    await engine.dispose()

    print("\n=== Seed Summary ===")
    print("  - Admin: admin@farmertohome.in / Admin@123")
    print("  - Farmer 1: 9876543210 / Farmer@123 (Rajesh Patil, Nashik)")
    print("  - Farmer 2: 9765432109 / Farmer@123 (Sunita Jadhav, Pune)")
    print(f"  - {product_count} products created")
    print("\nSeed completed successfully!")


if __name__ == "__main__":
    asyncio.run(seed())
