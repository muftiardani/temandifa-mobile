"""
Async preprocessing utilities for image processing.
Uses ThreadPoolExecutor to run CPU-bound preprocessing asynchronously.
"""

import asyncio
from concurrent.futures import ThreadPoolExecutor
from functools import partial

from app.core import logger
from app.core.config import settings

# Shared executor for preprocessing tasks
_preprocessing_executor = ThreadPoolExecutor(
    max_workers=settings.ai_worker_threads,
    thread_name_prefix="preprocessing",
)


async def preprocess_image_async(
    image_bytes: bytes,
    max_dimension: int | None = None,
    quality: int | None = None,
) -> bytes:
    """
    Asynchronously preprocess image for AI inference.

    Args:
        image_bytes: Raw image bytes
        max_dimension: Max width/height (default: settings.max_image_dimension)
        quality: JPEG quality (default: settings.image_quality)

    Returns:
        Preprocessed image bytes
    """
    if max_dimension is None:
        max_dimension = settings.max_image_dimension
    if quality is None:
        quality = settings.image_quality

    loop = asyncio.get_event_loop()

    try:
        result = await loop.run_in_executor(
            _preprocessing_executor,
            partial(
                _preprocess_image_sync,
                image_bytes,
                max_dimension,
                quality,
            ),
        )
        return result
    except Exception as e:
        logger.warning(f"Async preprocessing failed, returning original: {e}")
        return image_bytes


def _preprocess_image_sync(
    image_bytes: bytes,
    max_dimension: int,
    quality: int,
) -> bytes:
    """
    Synchronous image preprocessing (runs in thread pool).
    Resizes and compresses image if needed.
    """
    try:
        from io import BytesIO

        from PIL import Image

        # Open image
        img = Image.open(BytesIO(image_bytes))

        # Check if resize needed
        width, height = img.size
        if width <= max_dimension and height <= max_dimension:
            # No resize needed, return original
            return image_bytes

        # Calculate new dimensions maintaining aspect ratio
        if width > height:
            new_width = max_dimension
            new_height = int(height * (max_dimension / width))
        else:
            new_height = max_dimension
            new_width = int(width * (max_dimension / height))

        # Resize with high quality
        img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)

        # Convert to RGB if needed (for JPEG)
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")

        # Save to bytes
        output = BytesIO()
        img.save(output, format="JPEG", quality=quality, optimize=True)
        output.seek(0)

        logger.debug(f"Image resized: {width}x{height} -> {new_width}x{new_height}")

        return output.getvalue()

    except Exception as e:
        logger.warning(f"Image preprocessing failed: {e}")
        return image_bytes


async def preprocess_images_batch_async(
    images: list[bytes],
    max_dimension: int | None = None,
    quality: int | None = None,
) -> list[bytes]:
    """
    Preprocess multiple images in parallel.

    Args:
        images: List of image bytes
        max_dimension: Max width/height
        quality: JPEG quality

    Returns:
        List of preprocessed image bytes
    """
    tasks = [preprocess_image_async(img, max_dimension, quality) for img in images]
    return await asyncio.gather(*tasks)


def shutdown_preprocessing_executor():
    """Shutdown the preprocessing executor gracefully."""
    _preprocessing_executor.shutdown(wait=True)
    logger.info("Preprocessing executor shutdown complete")
