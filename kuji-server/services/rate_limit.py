"""Fixed-window rate limiter backed by Redis.

Used to cap abusive endpoints (e.g. room creation). Fails open: if Redis is
unavailable we allow the request rather than lock out legitimate users.
"""
from __future__ import annotations

from redis_client import get_redis


async def check_rate_limit(key: str, limit: int, window_seconds: int) -> bool:
    """Increment the counter for `key`; return True if still within `limit`
    for the current `window_seconds`, False if the limit is exceeded."""
    r = get_redis()
    redis_key = f"ratelimit:{key}"
    try:
        count = await r.incr(redis_key)
        if count == 1:
            await r.expire(redis_key, window_seconds)
        return count <= limit
    except Exception:
        # Availability over strictness: don't block traffic on a Redis hiccup.
        return True
