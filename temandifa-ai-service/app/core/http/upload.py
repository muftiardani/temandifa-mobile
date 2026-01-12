"""
File upload validation utilities.
Consolidates common validation logic used across routers.
"""

from fastapi import HTTPException, UploadFile, status

from app.core.config import settings
from app.core.http.validation import validate_audio_file, validate_image_file


async def read_and_validate_image(
    file: UploadFile, max_size: int | None = None
) -> bytes:
    """
    Read and validate an uploaded image file.

    Args:
        file: FastAPI UploadFile
        max_size: Max file size in bytes (default: settings.max_image_size)

    Returns:
        File contents as bytes

    Raises:
        HTTPException: If file is too large or invalid type
    """
    if max_size is None:
        max_size = settings.max_image_size

    # Check file size
    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)

    if file_size > max_size:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Max size: {max_size / (1024*1024):.1f}MB",
        )

    # Read content
    contents = await file.read()

    # Validate magic bytes
    validate_image_file(contents, file.filename or "unknown")

    return contents


async def read_and_validate_audio(
    file: UploadFile, max_size: int | None = None
) -> tuple[bytes, str]:
    """
    Read and validate an uploaded audio file.

    Args:
        file: FastAPI UploadFile
        max_size: Max file size in bytes (default: settings.max_audio_size)

    Returns:
        Tuple of (file contents, filename)

    Raises:
        HTTPException: If file is too large or invalid type
    """
    if max_size is None:
        max_size = settings.max_audio_size

    # Check file size
    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)

    if file_size > max_size:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Max size: {max_size / (1024*1024):.1f}MB",
        )

    # Read content
    contents = await file.read()
    filename = file.filename or "audio.wav"

    # Validate magic bytes
    validate_audio_file(contents, filename)

    return contents, filename
