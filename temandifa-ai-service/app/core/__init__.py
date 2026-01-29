"""
TemanDifa AI Service - Core Module.

This module provides centralized exports for all core functionality.
The modules are organized into subpackages:
- infrastructure/: Cache, gRPC client, rate limiter
- performance/: Batcher, memory pool, circuit breaker
- http/: Middleware, security, upload, validation
"""

# Root-level modules
from .config import settings
from .exceptions import (
    AIServiceException,
    FileTooLargeException,
    InvalidFileTypeException,
    ModelNotReadyException,
    ValidationException,
)

# HTTP submodule re-exports (backward compatibility)
from .http import (
    require_api_key,
    validate_audio_file,
    validate_file_size,
    validate_image_file,
    verify_api_key,
)

# Infrastructure submodule re-exports (backward compatibility)
from .infrastructure import (
    ai_client,
    clear_cache_by_prefix,
    generate_cache_key,
    get_cache_stats,
    get_cached,
    limiter,
    set_cached,
)
from .logging import logger, setup_logging
from .metrics import track_inference, track_request

# Performance submodule re-exports (backward compatibility)
from .performance import (
    CircuitBreaker,
    CircuitBreakerOpenError,
    DynamicBatcher,
    MemoryPool,
    audio_buffer,
    get_all_pool_stats,
    get_pool,
    image_buffer,
)

__all__ = [
    # Config
    "settings",
    # Logging
    "logger",
    "setup_logging",
    # Exceptions
    "AIServiceException",
    "ModelNotReadyException",
    "ValidationException",
    "FileTooLargeException",
    "InvalidFileTypeException",
    # Metrics
    "track_inference",
    "track_request",
    # Infrastructure
    "ai_client",
    "limiter",
    "generate_cache_key",
    "get_cached",
    "set_cached",
    "clear_cache_by_prefix",
    "get_cache_stats",
    # HTTP
    "verify_api_key",
    "require_api_key",
    "validate_image_file",
    "validate_audio_file",
    "validate_file_size",
    # Performance
    "DynamicBatcher",
    "MemoryPool",
    "get_pool",
    "image_buffer",
    "audio_buffer",
    "get_all_pool_stats",
    "CircuitBreaker",
    "CircuitBreakerOpenError",
]
