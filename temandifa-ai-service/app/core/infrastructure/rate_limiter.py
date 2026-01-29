"""
Rate limiter configuration using SlowAPI.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import settings

# Initialize rate limiter with Redis storage
# Falls back to memory if redis_url is not set (but it should be in docker-compose)
limiter = Limiter(
    key_func=get_remote_address,
    storage_uri=settings.redis_url or "memory://",
)
