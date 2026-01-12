"""
OpenAI Whisper Audio Transcription Service.
Supports multiple model sizes and async processing.
Optimized using faster-whisper (CTranslate2) with memory pool integration.
"""

import asyncio
import logging
import os
import tempfile
from concurrent.futures import ThreadPoolExecutor

from faster_whisper import WhisperModel
from tenacity import before_log, retry, stop_after_attempt, wait_exponential

from app.core import logger
from app.core.config import settings
from app.core.metrics import track_inference

# Conditional import for memory pool
if settings.memory_pool_enabled:
    from app.core.performance.memory_pool import audio_buffer


class TranscriptionService:
    """Whisper-based audio transcription with async support."""

    def __init__(self):
        self.model = None
        self.executor = ThreadPoolExecutor(max_workers=settings.ai_worker_threads)

    def load(self):
        """Explicitly load the Whisper model."""
        self._load_model()

    @retry(
        stop=stop_after_attempt(settings.warmup_max_retries),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        before=before_log(logging.getLogger("temandifa-ai"), logging.WARNING),
        reraise=True,
    )
    def _load_model(self):
        """Load Whisper model with configured size and retry logic."""
        try:
            device = settings.resolved_whisper_device
            compute_type = "int8" if device == "cpu" else "float16"

            logger.info(
                "Loading faster-whisper model",
                model_size=settings.whisper_model,
                device=device,
                compute_type=compute_type,
            )

            self.model = WhisperModel(
                settings.whisper_model,
                device=device,
                compute_type=compute_type,
                download_root=os.environ.get(
                    "XDG_CACHE_HOME", "/app/models/.cache/whisper"
                ),
            )
            logger.info("faster-whisper model loaded successfully", device=device)
        except Exception as e:
            logger.error("Failed to load faster-whisper model", error=str(e))
            self.model = None
            raise

    def _write_temp_file(self, audio_bytes: bytes, suffix: str) -> str:
        """Write audio to temp file using memory pool if enabled."""
        if settings.memory_pool_enabled:
            with audio_buffer() as buffer:
                buffer.write(audio_bytes)
                buffer.seek(0)
                data = buffer.read()
        else:
            data = audio_bytes

        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as temp:
            temp.write(data)
            return temp.name

    def transcribe_audio(self, audio_bytes: bytes, filename: str) -> dict:
        """
        Transcribe audio to text (synchronous).

        Args:
            audio_bytes: Raw audio bytes
            filename: Original filename (for extension detection)

        Returns:
            Dictionary with text and detected language
        """
        if self.model is None:
            raise RuntimeError("Whisper model not loaded")

        suffix = os.path.splitext(filename)[1] if "." in filename else ".wav"
        temp_path = None

        try:
            temp_path = self._write_temp_file(audio_bytes, suffix)

            logger.debug(
                "Starting transcription", filename=filename, temp_path=temp_path
            )

            segments, info = self.model.transcribe(temp_path, beam_size=5)

            text_segments = [segment.text for segment in segments]
            full_text = " ".join(text_segments).strip()

            logger.debug(
                "Transcription completed",
                language=info.language,
                duration=info.duration,
                text_length=len(full_text),
            )

            return {
                "text": full_text,
                "language": info.language,
                "duration": info.duration,
            }

        except Exception as e:
            logger.error("Transcription failed", error=str(e))
            raise

        finally:
            if temp_path and os.path.exists(temp_path):
                try:
                    os.remove(temp_path)
                    logger.debug("Cleaned up temp audio file", path=temp_path)
                except OSError as e:
                    logger.warning(
                        "Failed to remove temp file", path=temp_path, error=str(e)
                    )

    @track_inference("whisper")
    async def transcribe_audio_async(self, audio_bytes: bytes, filename: str) -> dict:
        """Transcribe audio to text (async, non-blocking)."""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            self.executor, self.transcribe_audio, audio_bytes, filename
        )

    def get_status(self) -> dict:
        """Get service status for health checks."""
        return {
            "model_loaded": self.model is not None,
            "model_size": settings.whisper_model,
            "device": settings.resolved_whisper_device,
            "memory_pool_enabled": settings.memory_pool_enabled,
        }

