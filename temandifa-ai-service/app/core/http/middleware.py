"""
Custom middleware for AI service.
Includes: Timeout, Memory Monitor, Request ID, and Memory Cleanup.
"""

import asyncio
import gc
import uuid
from contextvars import ContextVar

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.core.config import settings
from app.core.logging import logger
from app.core.metrics import update_memory_usage

# Context variable for request ID (thread-safe)
request_id_ctx: ContextVar[str] = ContextVar("request_id", default="-")


def get_request_id() -> str:
    """Get current request ID from context."""
    return request_id_ctx.get()


class RequestIDMiddleware(BaseHTTPMiddleware):
    """
    Request ID middleware for request tracing.
    - Generates unique ID for each request
    - Propagates existing X-Request-ID header
    - Adds request ID to response headers
    - Stores in context for logging
    """

    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("X-Request-ID")
        if not request_id:
            request_id = str(uuid.uuid4())[:8]  # Short UUID for readability

        token = request_id_ctx.set(request_id)

        request.state.request_id = request_id

        try:
            response: Response = await call_next(request)
            response.headers["X-Request-ID"] = request_id
            return response
        finally:
            request_id_ctx.reset(token)


class TimeoutMiddleware(BaseHTTPMiddleware):
    """
    Request timeout middleware.
    Cancels requests that take longer than the configured timeout.
    """

    async def dispatch(self, request: Request, call_next):
        request_id = getattr(request.state, "request_id", "-")
        try:
            response = await asyncio.wait_for(
                call_next(request), timeout=settings.request_timeout
            )
            return response
        except asyncio.TimeoutError:
            logger.warning(
                "Request timeout",
                request_id=request_id,
                timeout=settings.request_timeout,
                method=request.method,
                path=request.url.path,
            )
            return JSONResponse(
                status_code=504,
                content={
                    "status": "error",
                    "request_id": request_id,
                    "error": {
                        "code": "REQUEST_TIMEOUT",
                        "message": f"Request timeout after {settings.request_timeout}s",
                    },
                },
            )


class MemoryMonitorMiddleware(BaseHTTPMiddleware):
    """
    Middleware to update memory usage metrics periodically.
    Updates on every Nth request to avoid overhead.
    """

    request_count = 0
    UPDATE_INTERVAL = 10  # Update every 10 requests

    async def dispatch(self, request: Request, call_next):
        MemoryMonitorMiddleware.request_count += 1

        # Update memory metrics periodically
        if MemoryMonitorMiddleware.request_count % self.UPDATE_INTERVAL == 0:
            try:
                import psutil

                mem = psutil.virtual_memory()
                update_memory_usage()

                # Log warning if memory usage is high (>85%)
                if mem.percent > 85.0:
                    logger.warning(
                        "High memory usage",
                        percent=mem.percent,
                        available_mb=mem.available / 1024 / 1024,
                    )
            except ImportError:
                pass

        return await call_next(request)


class MemoryCleanupMiddleware(BaseHTTPMiddleware):
    """
    Memory cleanup middleware for large file processing.
    Triggers garbage collection after processing large requests.
    """

    # Threshold in bytes (5MB)
    CLEANUP_THRESHOLD = 5 * 1024 * 1024

    async def dispatch(self, request: Request, call_next):
        # Check content length
        content_length = request.headers.get("content-length")
        is_large_request = (
            content_length and int(content_length) > self.CLEANUP_THRESHOLD
        )

        response = await call_next(request)

        # Trigger GC after large file processing
        if is_large_request:
            gc.collect()
            logger.debug(
                "Memory cleanup triggered",
                content_length=content_length,
                request_id=getattr(request.state, "request_id", "-"),
            )

        return response
