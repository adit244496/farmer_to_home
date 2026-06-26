import redis.asyncio as aioredis
from typing import Optional

from app.core.config import settings

_redis_client: Optional[aioredis.Redis] = None


async def get_redis() -> aioredis.Redis:
    global _redis_client
    if _redis_client is None:
        _redis_client = aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
        )
    return _redis_client


async def add_to_blocklist(token: str) -> None:
    redis = await get_redis()
    # Store for 30 days (max token lifetime)
    await redis.setex(f"blocklist:{token}", 60 * 60 * 24 * 30, "1")


async def is_blocklisted(token: str) -> bool:
    redis = await get_redis()
    result = await redis.get(f"blocklist:{token}")
    return result is not None


async def set_otp(phone: str, otp: str) -> None:
    redis = await get_redis()
    expiry_seconds = settings.OTP_EXPIRY_MINUTES * 60
    await redis.setex(f"otp:{phone}", expiry_seconds, otp)


async def verify_otp(phone: str, otp: str) -> bool:
    redis = await get_redis()
    stored_otp = await redis.get(f"otp:{phone}")
    if stored_otp and stored_otp == otp:
        await redis.delete(f"otp:{phone}")
        return True
    return False


async def get_rate_limit(phone: str) -> int:
    redis = await get_redis()
    count = await redis.get(f"otp_rate:{phone}")
    return int(count) if count else 0


async def increment_rate_limit(phone: str) -> int:
    redis = await get_redis()
    pipe = redis.pipeline()
    key = f"otp_rate:{phone}"
    pipe.incr(key)
    pipe.expire(key, 3600)  # 1 hour window
    results = await pipe.execute()
    return results[0]


async def set_email_otp(email: str, otp: str) -> None:
    redis = await get_redis()
    expiry_seconds = settings.OTP_EXPIRY_MINUTES * 60
    await redis.setex(f"otp:email:{email}", expiry_seconds, otp)


async def verify_email_otp(email: str, otp: str) -> bool:
    redis = await get_redis()
    stored_otp = await redis.get(f"otp:email:{email}")
    if stored_otp and stored_otp == otp:
        await redis.delete(f"otp:email:{email}")
        return True
    return False


async def get_email_rate_limit(email: str) -> int:
    redis = await get_redis()
    count = await redis.get(f"otp_rate:email:{email}")
    return int(count) if count else 0


async def increment_email_rate_limit(email: str) -> int:
    redis = await get_redis()
    pipe = redis.pipeline()
    key = f"otp_rate:email:{email}"
    pipe.incr(key)
    pipe.expire(key, 3600)
    results = await pipe.execute()
    return results[0]


async def close_redis() -> None:
    global _redis_client
    if _redis_client:
        await _redis_client.aclose()
        _redis_client = None
