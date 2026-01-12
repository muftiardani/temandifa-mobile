"""
Redis Caching Layer for AI Service.
Provides hash-based caching for AI inference results.
Uses connection pooling for better reliability.
"""

import hashlib
import json

from app.core.config import settings
from app.core.logging import logger

# Redis connection pool and client (lazily initialized)
_redis_pool = None
_redis_client = None


def get_redis_client():
    """Get or create Redis client with connection pool."""
    global _redis_client, _redis_pool

    if _redis_client is not None:
        try:
            # Test if connection is still alive
            _redis_client.ping()
            return _redis_client
        except Exception:
            # Connection lost, reset and reconnect
            logger.warning("Redis connection lost, reconnecting...")
            _redis_client = None
            _redis_pool = None

    if not settings.redis_url:
        return None

    try:
        import redis

        # Create connection pool if not exists
        if _redis_pool is None:
            _redis_pool = redis.ConnectionPool.from_url(
                settings.redis_url,
                decode_responses=False,
                max_connections=settings.redis_pool_size,
                socket_timeout=5.0,
                socket_connect_timeout=5.0,
                retry_on_timeout=True,
            )
            logger.info(
                "Redis connection pool created",
                pool_size=settings.redis_pool_size,
            )

        _redis_client = redis.Redis(connection_pool=_redis_pool)
        # Test connection
        _redis_client.ping()
        logger.info("Redis cache connected", url=settings.redis_url)
        return _redis_client
    except Exception as e:
        logger.warning("Redis cache unavailable", error=str(e))
        _redis_pool = None
        _redis_client = None
        return None


def generate_cache_key(prefix: str, content: bytes) -> str:
    """
    Generate cache key from content hash.

    Args:
        prefix: Cache key prefix (e.g., 'detect', 'ocr', 'transcribe')
        content: File content bytes

    Returns:
        Cache key string
    """
    hash_val = hashlib.sha256(content).hexdigest()[:32]
    return f"ai:{prefix}:{hash_val}"


def get_cached(key: str) -> dict | None:
    """
    Get cached result.

    Args:
        key: Cache key

    Returns:
        Cached dict or None if not found
    """
    client = get_redis_client()
    if not client:
        return None

    try:
        data = client.get(key)
        if data:
            logger.debug("Cache hit", key=key)
            return json.loads(data)
        return None
    except Exception as e:
        logger.warning("Cache get error", key=key, error=str(e))
        return None


def set_cached(key: str, value: dict, ttl: int) -> bool:
    """
    Set cached result.

    Args:
        key: Cache key
        value: Dict to cache
        ttl: Time-to-live in seconds

    Returns:
        True if cached successfully
    """
    client = get_redis_client()
    if not client:
        return False

    try:
        data = json.dumps(value)
        client.setex(key, ttl, data)
        logger.debug("Cache set", key=key, ttl=ttl)
        return True
    except Exception as e:
        logger.warning("Cache set error", key=key, error=str(e))
        return False


def delete_cached(key: str) -> bool:
    """Delete a cached key."""
    client = get_redis_client()
    if not client:
        return False

    try:
        client.delete(key)
        return True
    except Exception:
        return False


def clear_cache_by_prefix(prefix: str) -> int:
    """
    Clear all keys with given prefix.

    Args:
        prefix: Key prefix (e.g., 'ai:detect')

    Returns:
        Number of keys deleted
    """
    client = get_redis_client()
    if not client:
        return 0

    try:
        pattern = f"{prefix}:*"
        keys = client.keys(pattern)
        if keys:
            deleted = client.delete(*keys)
            logger.info("Cache cleared", prefix=prefix, deleted=deleted)
            return deleted
        return 0
    except Exception as e:
        logger.warning("Cache clear error", prefix=prefix, error=str(e))
        return 0


def get_cache_stats() -> dict:
    """Get cache statistics."""
    client = get_redis_client()
    if not client:
        return {"connected": False}

    try:
        info = client.info("memory")
        dbsize = client.dbsize()
        return {
            "connected": True,
            "keys": dbsize,
            "used_memory": info.get("used_memory_human", "unknown"),
            "max_memory": info.get("maxmemory_human", "unlimited"),
        }
    except Exception as e:
        return {"connected": False, "error": str(e)}
