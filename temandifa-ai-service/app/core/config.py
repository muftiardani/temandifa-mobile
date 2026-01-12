"""
Centralized configuration management using pydantic-settings.
"""

import os
from functools import cached_property
from typing import Literal

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings with environment variable support."""

    app_name: str = "TemanDifa AI Service"
    app_version: str = "1.0.0"
    debug: bool = False

    # Model Settings - yolo_device can be "auto", "cpu", "cuda", "cuda:0", "mps"
    yolo_model: str = "models/yolov8n.pt"
    yolo_device: str = "auto"  # Changed default to auto
    whisper_model: Literal["tiny", "base", "small", "medium", "large"] = "base"
    whisper_device: str = "auto"  # Added whisper device setting
    ocr_default_lang: str = "en"

    max_image_size: int = 10 * 1024 * 1024
    max_audio_size: int = 25 * 1024 * 1024
    max_image_dimension: int = 1920
    image_quality: int = 85

    request_timeout: int = 120
    max_batch_size: int = 10

    # Concurrency & Resources
    # Dynamic scaling: use all available cores, fallback to 2 if detection fails
    ai_worker_threads: int = os.cpu_count() or 2
    temp_file_cleanup_delay: float = 0.5

    rate_limit_requests: int = 10
    rate_limit_window: str = "1 minute"

    log_level: str = "INFO"
    log_format: Literal["json", "text"] = "text"

    enable_metrics: bool = True
    warmup_max_retries: int = 3
    warmup_retry_delay: float = 2.0

    # Optimization Flags
    enable_onnx: bool = False
    enable_smart_fallback: bool = True

    # GPU Batch Inference Settings
    enable_batching: bool = True
    batch_max_size: int = 8  # Max images per batch
    batch_wait_ms: float = 50.0  # Max wait time before processing incomplete batch

    # Model Quantization Settings
    enable_quantization: bool = False  # Use INT8 quantized models
    yolo_model_quantized: str = "models/yolov8n_int8.onnx"  # Path to quantized model

    # Memory Pool Settings
    memory_pool_enabled: bool = True
    memory_pool_image_size: int = 10 * 1024 * 1024  # 10MB buffer for images
    memory_pool_audio_size: int = 25 * 1024 * 1024  # 25MB buffer for audio
    memory_pool_count: int = 4  # Number of buffers per pool

    # API Key Authentication
    api_key_enabled: bool = False
    api_key: str = ""

    # Redis Caching
    redis_url: str = ""
    redis_pool_size: int = 10  # Connection pool size
    cache_ttl_detection: int = 3600
    cache_ttl_ocr: int = 7200
    cache_ttl_transcription: int = 1800
    cache_ttl_vqa: int = 86400  # 24 hours for VQA responses

    # Gemini API (VQA)
    gemini_api_key: str = ""
    enable_vqa: bool = True

    ai_model_versions: dict = {
        "yolo": "yolov8n-8.1.0",
        "ocr": "paddleocr-2.7.0.3",
        "whisper": "base-20231117",
        "vqa": "gemini-1.5-flash",
    }

    @cached_property
    def resolved_yolo_device(self) -> str:
        """
        Resolve YOLO device with auto-detection.
        Returns 'cuda' if available when set to 'auto', otherwise 'cpu'.
        """
        if self.yolo_device.lower() != "auto":
            return self.yolo_device

        return self._detect_best_device()

    @cached_property
    def resolved_whisper_device(self) -> str:
        """
        Resolve Whisper device with auto-detection.
        """
        if self.whisper_device.lower() != "auto":
            return self.whisper_device

        return self._detect_best_device()

    def _detect_best_device(self) -> str:
        """Detect the best available device for AI inference."""
        try:
            import torch

            if torch.cuda.is_available():
                return "cuda"
            # Check for Apple Silicon MPS
            if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
                return "mps"
        except ImportError:
            pass
        return "cpu"

    @property
    def use_gpu(self) -> bool:
        """Check if GPU is enabled based on resolved device."""
        return self.resolved_yolo_device not in ("cpu", "CPU")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()
