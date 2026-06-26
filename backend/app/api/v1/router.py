from fastapi import APIRouter

from app.api.v1.routers.auth import router as auth_router
from app.api.v1.routers.users import router as users_router
from app.api.v1.routers.products import router as products_router
from app.api.v1.routers.categories import router as categories_router
from app.api.v1.routers.farmers import router as farmers_router
from app.api.v1.routers.customers import router as customers_router
from app.api.v1.routers.cart import router as cart_router
from app.api.v1.routers.orders import router as orders_router
from app.api.v1.routers.payments import router as payments_router
from app.api.v1.routers.reviews import router as reviews_router
from app.api.v1.routers.admin import router as admin_router

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth_router)
api_router.include_router(users_router)
api_router.include_router(products_router)
api_router.include_router(categories_router)
api_router.include_router(farmers_router)
api_router.include_router(customers_router)
api_router.include_router(cart_router)
api_router.include_router(orders_router)
api_router.include_router(payments_router)
api_router.include_router(reviews_router)
api_router.include_router(admin_router)
