"""
Graceful Degradation Module.

Provides fallback mechanisms when AI models fail or are unavailable.
Tracks service health and returns appropriate fallback responses.
"""

import time
from dataclasses import dataclass
from enum import Enum
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from app.schemas.detection import DetectionResponse
    from app.schemas.ocr import OCRResponse
    from app.schemas.transcription import TranscriptionResponse
    from app.schemas.vqa import VQAResponse

from app.core.logging import logger


class ServiceStatus(Enum):
    """Service health status."""

    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNAVAILABLE = "unavailable"


@dataclass
class ServiceHealth:
    """Tracks health status of a service."""

    name: str
    status: ServiceStatus = ServiceStatus.HEALTHY
    consecutive_failures: int = 0
    last_failure_time: float = 0.0
    last_success_time: float = 0.0
    failure_threshold: int = 3
    recovery_timeout: float = 60.0  # seconds
    total_requests: int = 0
    total_failures: int = 0

    def record_success(self):
        """Record a successful request."""
        self.consecutive_failures = 0
        self.last_success_time = time.time()
        self.total_requests += 1
        if self.status != ServiceStatus.HEALTHY:
            logger.info(f"Service {self.name} recovered to healthy status")
        self.status = ServiceStatus.HEALTHY

    def record_failure(self):
        """Record a failed request."""
        self.consecutive_failures += 1
        self.last_failure_time = time.time()
        self.total_requests += 1
        self.total_failures += 1

        if self.consecutive_failures >= self.failure_threshold:
            self.status = ServiceStatus.UNAVAILABLE
            logger.warning(
                f"Service {self.name} marked as unavailable "
                f"after {self.consecutive_failures} failures"
            )
        elif self.consecutive_failures >= self.failure_threshold // 2:
            self.status = ServiceStatus.DEGRADED
            logger.warning(f"Service {self.name} marked as degraded")

    def should_attempt_recovery(self) -> bool:
        """Check if we should attempt recovery."""
        if self.status == ServiceStatus.HEALTHY:
            return True
        time_since_failure = time.time() - self.last_failure_time
        return time_since_failure >= self.recovery_timeout

    def get_stats(self) -> dict:
        """Get health statistics."""
        return {
            "status": self.status.value,
            "consecutive_failures": self.consecutive_failures,
            "total_requests": self.total_requests,
            "total_failures": self.total_failures,
            "failure_rate": (
                (self.total_failures / self.total_requests * 100)
                if self.total_requests > 0
                else 0
            ),
        }


@dataclass
class FallbackResponse:
    """Standard fallback response structure."""

    success: bool
    is_fallback: bool
    message: str
    data: Any = None


class GracefulDegradation:
    """Manages graceful degradation for all AI services."""

    def __init__(self):
        self._services: dict[str, ServiceHealth] = {}
        self._initialize_services()

    def _initialize_services(self):
        """Initialize health tracking for all services."""
        services = ["detection", "ocr", "transcription", "vqa"]
        for service in services:
            self._services[service] = ServiceHealth(name=service)

    def get_service_health(self, service: str) -> ServiceHealth:
        """Get health status for a service."""
        if service not in self._services:
            self._services[service] = ServiceHealth(name=service)
        return self._services[service]

    def record_success(self, service: str):
        """Record successful request for a service."""
        self.get_service_health(service).record_success()

    def record_failure(self, service: str):
        """Record failed request for a service."""
        self.get_service_health(service).record_failure()

    def should_use_fallback(self, service: str) -> bool:
        """Check if fallback should be used for a service."""
        health = self.get_service_health(service)
        if health.status == ServiceStatus.UNAVAILABLE:
            if health.should_attempt_recovery():
                logger.info(f"Attempting recovery for {service}")
                return False  # Try real service
            return True
        return False

    def get_all_status(self) -> dict:
        """Get status for all services."""
        return {name: health.get_stats() for name, health in self._services.items()}


# Singleton instance
degradation = GracefulDegradation()


# Fallback responses for each service
def get_detection_fallback(filename: str) -> "DetectionResponse":
    """Return fallback response for object detection."""
    from app.schemas.detection import DetectionData, DetectionResponse

    return DetectionResponse(
        status="degraded",
        filename=filename,
        data=DetectionData(
            language="en",
            count=0,
            detections=[],
        ),
        is_fallback=True,
    )


def get_ocr_fallback(filename: str) -> "OCRResponse":
    """Return fallback response for OCR."""
    from app.schemas.ocr import OCRData, OCRResponse

    return OCRResponse(
        status="degraded",
        filename=filename,
        data=OCRData(
            full_text="",
            word_count=0,
            line_count=0,
            language="en",
            lines=[],
        ),
        is_fallback=True,
    )


def get_transcription_fallback(filename: str) -> "TranscriptionResponse":
    """Return fallback response for transcription."""
    from app.schemas.transcription import TranscriptionData, TranscriptionResponse

    return TranscriptionResponse(
        status="degraded",
        filename=filename,
        data=TranscriptionData(
            text="",
            language="unknown",
            duration=0.0,
        ),
        is_fallback=True,
    )


def get_vqa_fallback(filename: str, question: str) -> "VQAResponse":
    """Return fallback response for VQA."""
    from app.schemas.vqa import VQAData, VQAResponse

    return VQAResponse(
        status="degraded",
        filename=filename,
        data=VQAData(
            question=question,
            answer="I'm sorry, I cannot process your question at this time.",
        ),
        is_fallback=True,
    )
