"""
VQA (Visual Question Answering) Service using Google Gemini.
Enhanced with async support, retry logic, circuit breaker pattern, and memory pool.
"""

import asyncio
import io
import logging
from concurrent.futures import ThreadPoolExecutor

import google.generativeai as genai
from PIL import Image
from tenacity import before_log, retry, stop_after_attempt, wait_exponential

from app.core import logger
from app.core.performance.circuit_breaker import CircuitBreaker, CircuitBreakerOpenError
from app.core.config import settings
from app.core.metrics import track_inference

# Conditional import for memory pool
if settings.memory_pool_enabled:
    from app.core.performance.memory_pool import image_buffer

# Global circuit breaker for Gemini API
gemini_circuit_breaker = CircuitBreaker(
    name="gemini-api", failure_threshold=5, recovery_timeout=60.0, half_open_max_calls=2
)


class VQAService:
    """
    Visual Question Answering Service using Google Gemini 1.5 Flash.
    Features:
    - Async support with ThreadPoolExecutor
    - Retry logic with exponential backoff
    - Circuit breaker for rate limiting protection
    - Memory pool integration
    """

    def __init__(self):
        self.model = None
        self.is_ready = False
        self.executor = ThreadPoolExecutor(max_workers=settings.ai_worker_threads)

    def load(self):
        """Explicitly load/initialize the Gemini model."""
        self._load_model()

    @retry(
        stop=stop_after_attempt(settings.warmup_max_retries),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        before=before_log(logging.getLogger("temandifa-ai"), logging.WARNING),
        reraise=True,
    )
    def _load_model(self):
        """Load Gemini model with retry logic."""
        api_key = settings.gemini_api_key

        if not api_key:
            logger.warning("GEMINI_API_KEY not configured, VQA service unavailable")
            self.is_ready = False
            return

        try:
            genai.configure(api_key=api_key)
            self.model = genai.GenerativeModel("gemini-1.5-flash")
            self.is_ready = True
            logger.info("VQAService initialized with Gemini 1.5 Flash")
        except Exception as e:
            logger.error("Failed to initialize VQAService", error=str(e))
            self.is_ready = False
            raise

    def _load_image(self, image_data: bytes) -> Image.Image:
        """Load image with optional memory pool."""
        if settings.memory_pool_enabled:
            with image_buffer() as buffer:
                buffer.write(image_data)
                buffer.seek(0)
                return Image.open(io.BytesIO(buffer.read()))
        return Image.open(io.BytesIO(image_data))

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        before=before_log(logging.getLogger("temandifa-ai"), logging.WARNING),
        reraise=True,
    )
    def _call_gemini_api(self, image: Image.Image, question: str) -> str:
        """Call Gemini API with retry and circuit breaker."""

        def _api_call():
            response = self.model.generate_content([question, image])
            return response.text

        return gemini_circuit_breaker.execute(_api_call)

    @track_inference("vqa")
    def answer_question(self, image_data: bytes, question: str) -> str:
        """
        Send image and question to Gemini API.

        Args:
            image_data: Raw image bytes
            question: Question to ask about the image

        Returns:
            AI-generated answer string
        """
        if not self.is_ready or not self.model:
            raise ValueError("VQA service not initialized. Check GEMINI_API_KEY.")

        try:
            image = self._load_image(image_data)
            return self._call_gemini_api(image, question)

        except CircuitBreakerOpenError:
            logger.warning("VQA request rejected: Circuit breaker open")
            raise
        except Exception as e:
            error_msg = str(e).lower()
            if "429" in error_msg or "quota" in error_msg or "rate" in error_msg:
                logger.error("Gemini API rate limit hit", error=str(e))
                gemini_circuit_breaker.record_failure()
            raise

    async def answer_question_async(self, image_data: bytes, question: str) -> str:
        """Async version of answer_question."""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            self.executor, self.answer_question, image_data, question
        )

    def get_status(self) -> dict:
        """Get service status for health checks."""
        return {
            "ready": self.is_ready,
            "api_key_configured": bool(settings.gemini_api_key),
            "circuit_breaker": gemini_circuit_breaker.get_status(),
            "memory_pool_enabled": settings.memory_pool_enabled,
        }

