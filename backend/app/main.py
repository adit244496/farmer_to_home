import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
from sqlalchemy import text

from app.core.config import settings
from app.core.database import engine, Base
from app.core.redis_client import get_redis, close_redis
from app.api.v1.router import api_router
import app.models  # noqa: F401 — ensures all models are registered with Base.metadata

logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown events."""
    # Startup
    logger.info("Starting Farmer-to-Home API...")

    # Test DB connection and create missing tables
    try:
        async with engine.begin() as conn:
            await conn.execute(text("SELECT 1"))
            await conn.run_sync(Base.metadata.create_all)
            # Safe additive migrations for new columns
            await conn.execute(text(
                "ALTER TABLE products ADD COLUMN IF NOT EXISTS "
                "is_fresh_farm BOOLEAN DEFAULT FALSE NOT NULL"
            ))
            await conn.execute(text(
                "ALTER TABLE categories ADD COLUMN IF NOT EXISTS "
                "display_order INT DEFAULT 0 NOT NULL"
            ))
            await conn.execute(text(
                "ALTER TABLE products ADD COLUMN IF NOT EXISTS "
                "benefits JSON DEFAULT '[]'::json"
            ))
            await conn.execute(text(
                "ALTER TABLE products ADD COLUMN IF NOT EXISTS "
                "benefits_mr JSON DEFAULT '[]'::json"
            ))
            await conn.execute(text(
                "ALTER TABLE products ADD COLUMN IF NOT EXISTS "
                "critical_difference_en JSON DEFAULT '[]'::json"
            ))
            await conn.execute(text(
                "ALTER TABLE products ADD COLUMN IF NOT EXISTS "
                "critical_difference_mr JSON DEFAULT '[]'::json"
            ))
            await conn.execute(text(
                "ALTER TABLE products ALTER COLUMN farmer_id DROP NOT NULL"
            ))
            await conn.execute(text(
                "ALTER TABLE reviews ALTER COLUMN order_id DROP NOT NULL"
            ))
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS farmer_product_listings (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    farmer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
                    stock INTEGER NOT NULL DEFAULT 0,
                    price_override NUMERIC(10,2),
                    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
                    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
                    CONSTRAINT uq_farmer_product UNIQUE (farmer_id, product_id)
                )
            """))
        logger.info("PostgreSQL connection: OK")
    except Exception as e:
        logger.error(f"PostgreSQL connection failed: {e}")

    # Configure S3 bucket for public image access and CORS (browser presigned PUT uploads)
    if settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY and settings.AWS_BUCKET_NAME:
        try:
            import boto3
            import json as _json
            s3 = boto3.client(
                "s3",
                region_name=settings.AWS_REGION,
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            )
            # 1. Lift the "block all public access" guard so the policy below can take effect
            s3.put_public_access_block(
                Bucket=settings.AWS_BUCKET_NAME,
                PublicAccessBlockConfiguration={
                    "BlockPublicAcls": False,
                    "IgnorePublicAcls": False,
                    "BlockPublicPolicy": False,
                    "RestrictPublicBuckets": False,
                },
            )
            # 2. Bucket policy: allow anonymous GET on products/* so images render in browsers
            s3.put_bucket_policy(
                Bucket=settings.AWS_BUCKET_NAME,
                Policy=_json.dumps({
                    "Version": "2012-10-17",
                    "Statement": [
                        {
                            "Sid": "PublicReadProductImages",
                            "Effect": "Allow",
                            "Principal": "*",
                            "Action": "s3:GetObject",
                            "Resource": f"arn:aws:s3:::{settings.AWS_BUCKET_NAME}/products/*",
                        }
                    ],
                }),
            )
            # 3. CORS so presigned PUT from the browser doesn't get blocked by preflight
            s3.put_bucket_cors(
                Bucket=settings.AWS_BUCKET_NAME,
                CORSConfiguration={
                    "CORSRules": [
                        {
                            "AllowedOrigins": ["*"],
                            "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
                            "AllowedHeaders": ["*"],
                            "ExposeHeaders": ["ETag"],
                            "MaxAgeSeconds": 3000,
                        }
                    ]
                },
            )
            logger.info("S3 bucket: public access, bucket policy, and CORS configured")
        except Exception as e:
            logger.warning(f"S3 bucket setup skipped: {e}")

    # Test Redis connection
    try:
        redis = await get_redis()
        await redis.ping()
        logger.info("Redis connection: OK")
    except Exception as e:
        logger.error(f"Redis connection failed: {e}")

    yield

    # Shutdown
    logger.info("Shutting down Farmer-to-Home API...")
    await engine.dispose()
    await close_redis()


app = FastAPI(
    title="Farmer-to-Home API",
    description=(
        "Backend API for the Farmer-to-Home e-commerce platform — "
        "connecting Indian farmers directly with consumers. "
        "Supports OTP login, product management, cart, orders, payments via Razorpay, "
        "and admin controls."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all API routers
app.include_router(api_router)


# ─── Root & Health ──────────────────────────────────────────────────────────


@app.get("/", include_in_schema=False)
async def root():
    """Redirect root to API docs."""
    return RedirectResponse(url="/docs")


@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint for monitoring and load balancers."""
    db_ok = False
    redis_ok = False

    try:
        async with engine.begin() as conn:
            await conn.execute(text("SELECT 1"))
        db_ok = True
    except Exception as e:
        logger.error(f"Health check DB error: {e}")

    try:
        redis = await get_redis()
        await redis.ping()
        redis_ok = True
    except Exception as e:
        logger.error(f"Health check Redis error: {e}")

    overall = db_ok and redis_ok
    return JSONResponse(
        status_code=status.HTTP_200_OK if overall else status.HTTP_503_SERVICE_UNAVAILABLE,
        content={
            "status": "healthy" if overall else "degraded",
            "database": "connected" if db_ok else "disconnected",
            "redis": "connected" if redis_ok else "disconnected",
        },
    )


# ─── Exception Handlers ─────────────────────────────────────────────────────


@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={"error": "Not found", "path": str(request.url.path)},
    )


@app.exception_handler(422)
async def validation_error_handler(request: Request, exc):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": "Validation error",
            "detail": exc.errors() if hasattr(exc, "errors") else str(exc),
        },
    )


@app.exception_handler(500)
async def internal_server_error_handler(request: Request, exc):
    logger.error(f"Internal server error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"error": "Internal server error. Please try again later."},
    )
