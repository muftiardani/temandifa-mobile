"""
PaddleOCR Multi-language OCR Service.
Supports English, Indonesian, and Chinese text extraction with async processing.
Enhanced with memory pool integration.
"""

import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor

from paddleocr import PaddleOCR
from tenacity import before_log, retry, stop_after_attempt, wait_exponential

from app.core import logger
from app.core.config import settings
from app.core.metrics import track_inference
from app.utils.preprocessing import preprocess_image

# Conditional import for memory pool
if settings.memory_pool_enabled:
    from app.core.performance.memory_pool import image_buffer


class OCRService:
    """
    Multi-language OCR Service using PaddleOCR.
    Supports English, Indonesian, and Chinese text extraction.
    """

    SUPPORTED_LANGS = {
        "en": "en",
        "id": "en",
        "ch": "ch",
        "latin": "en",
    }

    def __init__(self):
        self.models: dict[str, PaddleOCR] = {}
        self.ocr: PaddleOCR | None = None
        self.executor = ThreadPoolExecutor(max_workers=settings.ai_worker_threads)

    def load(self):
        """Explicitly load the default model."""
        self._load_default_model()

    @retry(
        stop=stop_after_attempt(settings.warmup_max_retries),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        before=before_log(logging.getLogger("temandifa-ai"), logging.WARNING),
        reraise=True,
    )
    def _load_default_model(self):
        try:
            logger.info(
                "Loading PaddleOCR English model", use_onnx=settings.enable_onnx
            )

            self.models["en"] = PaddleOCR(
                use_angle_cls=True,
                lang="en",
                show_log=False,
                use_gpu=settings.use_gpu,
                enable_mkldnn=not settings.use_gpu,
                use_onnx=settings.enable_onnx,
            )
            self.ocr = self.models["en"]
            logger.info("PaddleOCR English model loaded successfully")
        except Exception as e:
            logger.error("Failed to load PaddleOCR model", error=str(e))
            raise

    def _get_model(self, lang: str) -> PaddleOCR:
        """Get or create OCR model for specified language."""
        paddle_lang = self.SUPPORTED_LANGS.get(lang, "en")

        if paddle_lang not in self.models:
            logger.info("Loading PaddleOCR model", language=paddle_lang)
            self.models[paddle_lang] = PaddleOCR(
                use_angle_cls=True,
                lang=paddle_lang,
                show_log=False,
                use_gpu=settings.use_gpu,
                enable_mkldnn=not settings.use_gpu,
                use_onnx=settings.enable_onnx,
            )
            logger.info("PaddleOCR model loaded", language=paddle_lang)

        return self.models[paddle_lang]

    def _preprocess_image(self, image_bytes: bytes):
        """Preprocess image with optional memory pool."""
        if settings.memory_pool_enabled:
            with image_buffer() as buffer:
                buffer.write(image_bytes)
                buffer.seek(0)
                return preprocess_image(buffer.read())
        return preprocess_image(image_bytes)

    def extract_text(self, image_bytes: bytes, lang: str = "en") -> dict:
        """
        Extract text from an image (synchronous).

        Args:
            image_bytes: Raw image bytes
            lang: Language code ('en', 'id', 'ch')

        Returns:
            Dictionary with full_text, lines with details, and word_count
        """
        img_array = self._preprocess_image(image_bytes)
        ocr_model = self._get_model(lang)

        try:
            result = ocr_model.ocr(img_array, cls=True)
        except Exception as e:
            error_msg = str(e).lower()
            if (
                ("out of memory" in error_msg or "cuda" in error_msg)
                and settings.enable_smart_fallback
                and settings.use_gpu
            ):
                logger.warning(
                    "OCR GPU Out of Memory, falling back to CPU for this request"
                )
                try:
                    fallback_model = PaddleOCR(
                        use_angle_cls=True,
                        lang=self.SUPPORTED_LANGS.get(lang, "en"),
                        show_log=False,
                        use_gpu=False,
                        enable_mkldnn=True,
                        use_onnx=settings.enable_onnx,
                    )
                    result = fallback_model.ocr(img_array, cls=True)
                except Exception as fallback_err:
                    logger.error("OCR Fallback also failed", error=str(fallback_err))
                    raise e
            else:
                raise e

        extracted_texts = []
        if result and result[0]:
            for line in result[0]:
                box = line[0]
                text = line[1][0]
                confidence = float(line[1][1])

                extracted_texts.append(
                    {
                        "text": text,
                        "confidence": round(confidence, 4),
                        "bbox": {
                            "top_left": box[0],
                            "top_right": box[1],
                            "bottom_right": box[2],
                            "bottom_left": box[3],
                        },
                    }
                )

        full_text = " ".join([item["text"] for item in extracted_texts])
        word_count = len(full_text.split()) if full_text else 0

        logger.debug("OCR completed", lines=len(extracted_texts), words=word_count)

        return {
            "full_text": full_text,
            "word_count": word_count,
            "line_count": len(extracted_texts),
            "language": lang,
            "lines": extracted_texts,
        }

    @track_inference("ocr")
    async def extract_text_async(self, image_bytes: bytes, lang: str = "en") -> dict:
        """Extract text from an image (async, non-blocking)."""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            self.executor, self.extract_text, image_bytes, lang
        )

    def get_status(self) -> dict:
        """Get service status for health checks."""
        return {
            "model_loaded": self.ocr is not None,
            "loaded_languages": list(self.models.keys()),
            "memory_pool_enabled": settings.memory_pool_enabled,
            "use_gpu": settings.use_gpu,
        }
