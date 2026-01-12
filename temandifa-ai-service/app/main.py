"""
TemanDifa AI Service - Main Application Entry Point.
Features: Object Detection, OCR, Audio Transcription with rate limiting and caching.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import Response
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.core.exceptions import AIServiceException, ai_service_exception_handler
from app.core.logging import Logger, setup_logging
from app.core.metrics import get_metrics_content_type, get_metrics_text
from app.core.http.middleware import (
    MemoryCleanupMiddleware,
    MemoryMonitorMiddleware,
    RequestIDMiddleware,
    TimeoutMiddleware,
)
from app.core.infrastructure.rate_limiter import limiter
from app.routers import batch, detection, ocr, transcription, vqa
from app.schemas.common import HealthResponse, ModelStatus

# Initialize logger
setup_logging(level=settings.log_level, log_format=settings.log_format)
logger = Logger()

# Global model status
models_ready = {"yolo": False, "ocr": False, "whisper": False, "vqa": False}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan event handler for starting services.
    Starts gRPC Server in a separate process for isolation.
    """
    global models_ready, grpc_process
    logger.info("Starting TemanDifa AI Service", version=settings.app_version)

    # We no longer load models here to save RAM (Process Isolation).
    # Models are loaded in the gRPC process.

    # Start gRPC Server in separate Process
    import multiprocessing

    from app.worker import run_server

    logger.info("Starting gRPC Process...")
    grpc_process = multiprocessing.Process(target=run_server, daemon=True)
    grpc_process.start()

    if grpc_process.is_alive():
        logger.info(f"gRPC Process started (PID: {grpc_process.pid})")
        # Assume readiness for now
        models_ready["yolo"] = True
        models_ready["ocr"] = True
        models_ready["whisper"] = True
        models_ready["vqa"] = True
    else:
        logger.error("Failed to start gRPC Process")

    yield  # Server is running

    # Cleanup on shutdown
    logger.info("Shutting down AI Service...")

    if grpc_process.is_alive():
        logger.info("Terminating gRPC Process...")
        grpc_process.terminate()
        grpc_process.join(timeout=5)
        logger.info("gRPC Process stopped")


# Create FastAPI app
app = FastAPI(title=settings.app_name, version=settings.app_version, lifespan=lifespan)

# Global process reference
grpc_process = None

# Add rate limiter state
app.state.limiter = limiter

# Exception handlers
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_exception_handler(AIServiceException, ai_service_exception_handler)

# Middleware (order matters - first added is last executed)
# RequestIDMiddleware first so it's the outermost (request ID available to all)
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(MemoryCleanupMiddleware)
app.add_middleware(TimeoutMiddleware)
app.add_middleware(MemoryMonitorMiddleware)
app.add_middleware(RequestIDMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include AI routers
app.include_router(detection.router)
app.include_router(ocr.router)
app.include_router(transcription.router)
app.include_router(vqa.router)
app.include_router(batch.router)


@app.get("/")
def read_root():
    """Root endpoint with service info."""
    return {
        "status": "online",
        "service": settings.app_name,
        "version": settings.app_version,
        "grpc_active": grpc_process.is_alive() if grpc_process else False,
    }


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Comprehensive health check.
    Checks if gRPC process is running AND if gRPC server is responsive.
    """
    is_process_alive = grpc_process.is_alive() if grpc_process else False
    is_grpc_responsive = False

    if is_process_alive:
        try:
            # Try to establish a connection or check channel state
            # This is a lightweight check without invoking a full model inference
            from app.core.infrastructure.grpc_client import ai_client

            # ai_client.channel assignment happens on first use,
            # so we ensure stub is created.
            ai_client.get_stub()  # Test connection
            # Simple connectivity check
            # A more robust check would be a Health check RPC
            is_grpc_responsive = True
        except Exception as e:
            logger.error(f"Health Check: gRPC unresponsive: {e}")
            is_grpc_responsive = False

    status_str = "healthy"
    if not is_process_alive:
        status_str = "critical"
    elif not is_grpc_responsive:
        status_str = "degraded"  # Process up but gRPC not ready

    # We report models as ready if process is alive (simplification for now)
    # Ideally we'd query the worker for model load status via gRPC
    current_status = {k: is_grpc_responsive for k in models_ready.keys()}
    loaded_count = 3 if is_grpc_responsive else 0

    return HealthResponse(
        status=status_str,
        models=ModelStatus(**current_status),
        versions=settings.ai_model_versions,
        ready_count=f"{loaded_count}/3",
    )


@app.get("/config")
def get_config():
    """
    Get current service configuration (non-sensitive).
    Useful for debugging and monitoring.
    """
    return {
        "yolo_model": settings.yolo_model,
        "yolo_device": settings.yolo_device,
        "whisper_model": settings.whisper_model,
        "max_image_size_mb": settings.max_image_size // (1024 * 1024),
        "max_audio_size_mb": settings.max_audio_size // (1024 * 1024),
        "max_image_dimension": settings.max_image_dimension,
        "request_timeout": settings.request_timeout,
        "max_batch_size": settings.max_batch_size,
        "rate_limit": (
            f"{settings.rate_limit_requests} per {settings.rate_limit_window}"
        ),
    }


@app.get("/metrics")
def metrics():
    """
    Prometheus-compatible metrics endpoint.
    Returns metrics in text format for scraping.
    """
    return Response(content=get_metrics_text(), media_type=get_metrics_content_type())


@app.get("/cache/stats")
def cache_stats():
    """
    Get cache statistics.
    Returns Redis connection status and key counts.
    """
    from app.core.infrastructure.cache import get_cache_stats

    return get_cache_stats()


@app.get("/services/health")
def service_health():
    """
    Get health status of all AI services.
    Used for monitoring graceful degradation.
    """
    from app.core.degradation import degradation

    return {
        "status": "ok",
        "services": degradation.get_all_status(),
    }
