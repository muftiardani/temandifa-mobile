"""
Memory Pool for Large File Processing.
Provides reusable memory buffers to reduce allocation overhead.
"""

import io
import threading
from collections.abc import Generator
from contextlib import contextmanager

from app.core import logger


class MemoryPool:
    """
    Pool of reusable BytesIO buffers for efficient large file processing.

    Benefits:
    - Reduces memory allocation overhead
    - Prevents memory fragmentation
    - Improves GC performance

    Usage:
        pool = MemoryPool(buffer_size=10*1024*1024, pool_size=4)

        with pool.acquire() as buffer:
            buffer.write(large_data)
            # Process buffer
        # Buffer automatically returned to pool
    """

    def __init__(
        self,
        buffer_size: int = 10 * 1024 * 1024,  # 10MB default
        pool_size: int = 4,
        name: str = "default",
    ):
        """
        Initialize memory pool.

        Args:
            buffer_size: Initial size hint for each buffer
            pool_size: Number of buffers to maintain in pool
            name: Identifier for logging
        """
        self.buffer_size = buffer_size
        self.pool_size = pool_size
        self.name = name

        # Create pool of buffers
        self._pool: list[io.BytesIO] = []
        self._available: list[int] = []
        self._lock = threading.Lock()

        # Pre-allocate buffers
        for i in range(pool_size):
            buffer = io.BytesIO()
            # Pre-allocate memory
            buffer.write(b"\x00" * buffer_size)
            buffer.seek(0)
            buffer.truncate(0)
            self._pool.append(buffer)
            self._available.append(i)

        # Stats
        self._total_acquired = 0
        self._total_fallbacks = 0

        logger.info(
            "MemoryPool initialized",
            name=name,
            pool_size=pool_size,
            buffer_size_mb=buffer_size / (1024 * 1024),
        )

    @contextmanager
    def acquire(self) -> Generator[io.BytesIO, None, None]:
        """
        Acquire a buffer from the pool.

        If pool is exhausted, creates a new temporary buffer.
        Buffer is automatically returned to pool when context exits.

        Yields:
            BytesIO buffer ready for use
        """
        buffer: io.BytesIO
        idx: int | None = None
        is_pooled = True

        with self._lock:
            if self._available:
                idx = self._available.pop()
                buffer = self._pool[idx]
                self._total_acquired += 1
            else:
                # Pool exhausted, create temporary buffer
                buffer = io.BytesIO()
                is_pooled = False
                self._total_fallbacks += 1
                logger.debug(
                    "Pool exhausted, creating temporary buffer",
                    name=self.name,
                    fallback_count=self._total_fallbacks,
                )

        try:
            yield buffer
        finally:
            # Reset buffer
            buffer.seek(0)
            buffer.truncate(0)

            # Return to pool if it's a pooled buffer
            if is_pooled and idx is not None:
                with self._lock:
                    self._available.append(idx)

    def get_stats(self) -> dict:
        """Get pool statistics."""
        with self._lock:
            return {
                "name": self.name,
                "pool_size": self.pool_size,
                "available": len(self._available),
                "in_use": self.pool_size - len(self._available),
                "total_acquired": self._total_acquired,
                "total_fallbacks": self._total_fallbacks,
                "fallback_rate": (
                    self._total_fallbacks
                    / (self._total_acquired + self._total_fallbacks)
                    if (self._total_acquired + self._total_fallbacks) > 0
                    else 0.0
                ),
                "buffer_size_mb": self.buffer_size / (1024 * 1024),
            }

    def resize(self, new_pool_size: int):
        """
        Resize the pool.

        Note: Can only increase pool size. Decreasing requires waiting
        for buffers to be returned.
        """
        with self._lock:
            if new_pool_size > self.pool_size:
                for i in range(self.pool_size, new_pool_size):
                    buffer = io.BytesIO()
                    buffer.write(b"\x00" * self.buffer_size)
                    buffer.seek(0)
                    buffer.truncate(0)
                    self._pool.append(buffer)
                    self._available.append(i)

                self.pool_size = new_pool_size
                logger.info(
                    "Pool resized",
                    name=self.name,
                    new_size=new_pool_size,
                )


class PooledBytesIO(io.BytesIO):
    """
    BytesIO subclass that automatically returns to pool when closed.
    """

    def __init__(self, pool: "MemoryPool", idx: int, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._pool = pool
        self._idx = idx
        self._returned = False

    def close(self):
        """Override close to return buffer to pool."""
        if not self._returned:
            self.seek(0)
            self.truncate(0)
            with self._pool._lock:
                self._pool._available.append(self._idx)
            self._returned = True
        super().close()


# Global memory pools for different use cases
_pools: dict[str, MemoryPool] = {}


def get_pool(name: str = "default") -> MemoryPool:
    """
    Get or create a memory pool by name.

    Args:
        name: Pool identifier

    Returns:
        MemoryPool instance
    """
    if name not in _pools:
        # Default configuration based on use case
        configs = {
            "default": {"buffer_size": 10 * 1024 * 1024, "pool_size": 4},
            "image": {"buffer_size": 10 * 1024 * 1024, "pool_size": 4},
            "audio": {"buffer_size": 25 * 1024 * 1024, "pool_size": 2},
            "large": {"buffer_size": 50 * 1024 * 1024, "pool_size": 2},
        }
        config = configs.get(name, configs["default"])
        _pools[name] = MemoryPool(
            buffer_size=config["buffer_size"],
            pool_size=config["pool_size"],
            name=name,
        )

    return _pools[name]


def get_all_pool_stats() -> dict[str, dict]:
    """Get stats for all pools."""
    return {name: pool.get_stats() for name, pool in _pools.items()}


# Convenience function for image processing
@contextmanager
def image_buffer() -> Generator[io.BytesIO, None, None]:
    """Get a buffer optimized for image processing."""
    with get_pool("image").acquire() as buffer:
        yield buffer


# Convenience function for audio processing
@contextmanager
def audio_buffer() -> Generator[io.BytesIO, None, None]:
    """Get a buffer optimized for audio processing."""
    with get_pool("audio").acquire() as buffer:
        yield buffer
