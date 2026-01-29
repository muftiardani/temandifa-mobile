"""
Metrics collection for monitoring.
Uses prometheus_client if available, otherwise provides stub implementation.
"""

import time
from collections.abc import Callable
from functools import wraps

from app.core.config import settings
from app.core.logging import logger

try:
    from prometheus_client import (
        CONTENT_TYPE_LATEST,
        Counter,
        Gauge,
        Histogram,
        generate_latest,
    )

    PROMETHEUS_AVAILABLE = True
except ImportError:
    PROMETHEUS_AVAILABLE = False
    logger.info("prometheus_client not installed, metrics disabled")


if PROMETHEUS_AVAILABLE and settings.enable_metrics:
    REQUEST_COUNT = Counter(
        "ai_service_requests_total", "Total number of requests", ["endpoint", "status"]
    )

    REQUEST_LATENCY = Histogram(
        "ai_service_request_latency_seconds",
        "Request latency in seconds",
        ["endpoint"],
        buckets=(0.1, 0.5, 1, 2, 5, 10, 30, 60, 120),
    )

    MODEL_INFERENCE_TIME = Histogram(
        "ai_service_model_inference_seconds",
        "Model inference time in seconds",
        ["model", "version"],
        buckets=(0.1, 0.5, 1, 2, 5, 10, 30),
    )

    DETECTION_COUNT = Counter(
        "ai_service_detections_total", "Total number of objects detected", ["label"]
    )

    MEMORY_USAGE = Gauge("ai_service_memory_bytes", "Memory usage in bytes")

    ACTIVE_REQUESTS = Gauge(
        "ai_service_active_requests", "Number of currently processing requests"
    )
else:

    class StubMetric:
        def labels(self, *args, **kwargs):
            return self

        def inc(self, *args, **kwargs):
            pass

        def dec(self, *args, **kwargs):
            pass

        def set(self, *args, **kwargs):
            pass

        def observe(self, *args, **kwargs):
            pass

    REQUEST_COUNT = StubMetric()
    REQUEST_LATENCY = StubMetric()
    MODEL_INFERENCE_TIME = StubMetric()
    DETECTION_COUNT = StubMetric()
    MEMORY_USAGE = StubMetric()
    ACTIVE_REQUESTS = StubMetric()


def get_metrics_text() -> str:
    """Get metrics in Prometheus text format."""
    if PROMETHEUS_AVAILABLE and settings.enable_metrics:
        return generate_latest().decode("utf-8")
    return "# Metrics disabled or prometheus_client not installed\n"


def get_metrics_content_type() -> str:
    """Get content type for metrics endpoint."""
    if PROMETHEUS_AVAILABLE:
        return CONTENT_TYPE_LATEST
    return "text/plain"


def track_request(endpoint: str):
    """Decorator to track request metrics."""

    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            ACTIVE_REQUESTS.inc()
            start_time = time.time()
            status = "success"

            try:
                result = await func(*args, **kwargs)
                return result
            except Exception:
                status = "error"
                raise
            finally:
                duration = time.time() - start_time
                REQUEST_COUNT.labels(endpoint=endpoint, status=status).inc()
                REQUEST_LATENCY.labels(endpoint=endpoint).observe(duration)
                ACTIVE_REQUESTS.dec()

        return wrapper

    return decorator


def track_inference(model: str):
    """Decorator to track model inference time."""

    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            start_time = time.time()
            result = await func(*args, **kwargs)
            duration = time.time() - start_time

            # Get version dynamically if possible, else simplified
            version = settings.ai_model_versions.get(model, "unknown")
            MODEL_INFERENCE_TIME.labels(model=model, version=version).observe(duration)
            return result

        return wrapper

    return decorator


def update_memory_usage():
    """Update memory usage metric."""
    try:
        import psutil

        process = psutil.Process()
        MEMORY_USAGE.set(process.memory_info().rss)
    except ImportError:
        pass
