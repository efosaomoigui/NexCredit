"""
services/identity_engine/app/core/redis.py
------------------------------------------
Redis client for OTP storage and rate limiting.
"""
import redis.asyncio as redis
import logging
from services.identity_engine.app.core.config import settings

logger = logging.getLogger(__name__)

redis_client = redis.Redis(
    host=settings.REDIS_HOST,
    port=settings.REDIS_PORT,
    decode_responses=True,
    socket_connect_timeout=0.5,
    socket_timeout=0.5,
)

_otp_memory_store: dict[str, str] = {}
_otp_attempts_store: dict[str, int] = {}

async def set_otp(phone: str, otp: str):
    key = f"otp:{phone}"
    try:
        await redis_client.setex(key, settings.OTP_TTL_SECONDS, otp)
    except Exception as exc:
        # Dev-safe fallback: keep OTP flows alive when Redis is unavailable.
        _otp_memory_store[phone] = otp
        logger.warning("otp_store_fallback_set redis_unavailable=%s key=%s", exc.__class__.__name__, key)

async def get_otp(phone: str) -> str:
    key = f"otp:{phone}"
    try:
        val = await redis_client.get(key)
        if val is not None:
            return val
    except Exception as exc:
        logger.warning("otp_store_fallback_get redis_unavailable=%s key=%s", exc.__class__.__name__, key)
    return _otp_memory_store.get(phone)

async def delete_otp(phone: str):
    key = f"otp:{phone}"
    _otp_memory_store.pop(phone, None)
    try:
        await redis_client.delete(key)
    except Exception as exc:
        logger.warning("otp_store_fallback_delete redis_unavailable=%s key=%s", exc.__class__.__name__, key)

async def increment_otp_attempts(phone: str) -> int:
    key = f"otp_attempts:{phone}"
    try:
        count = await redis_client.incr(key)
        if count == 1:
            await redis_client.expire(key, settings.OTP_RATE_LIMIT_HOURS * 3600)
        return count
    except Exception as exc:
        current = _otp_attempts_store.get(phone, 0) + 1
        _otp_attempts_store[phone] = current
        logger.warning("otp_attempts_fallback redis_unavailable=%s key=%s attempts=%s", exc.__class__.__name__, key, current)
        return current
