"""
File validation utilities with magic bytes detection.
More secure than relying only on content-type headers.
"""

from app.core.config import settings
from app.core.exceptions import FileTooLargeException, InvalidFileTypeException

# Magic bytes signatures for common file types
MAGIC_SIGNATURES = {
    # Images
    b"\xff\xd8\xff": "image/jpeg",
    b"\x89PNG\r\n\x1a\n": "image/png",
    b"GIF87a": "image/gif",
    b"GIF89a": "image/gif",
    b"II*\x00": "image/tiff",  # TIFF little-endian
    b"MM\x00*": "image/tiff",  # TIFF big-endian
    # Audio (non-RIFF)
    b"ID3": "audio/mpeg",  # MP3 with ID3 tag
    b"\xff\xfb": "audio/mpeg",  # MP3 without ID3
    b"\xff\xfa": "audio/mpeg",  # MP3 without ID3
    b"fLaC": "audio/flac",
    b"OggS": "audio/ogg",
    # Note: RIFF-based formats (WebP, WAV) handled in detect_file_type special cases
}

# Allowed types per endpoint
ALLOWED_IMAGE_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/tiff",
]
ALLOWED_AUDIO_TYPES = [
    "audio/mpeg",
    "audio/wav",
    "audio/webm",
    "audio/ogg",
    "audio/flac",
    "audio/m4a",
]


def detect_file_type(content: bytes) -> str | None:
    """
    Detect file type from magic bytes.

    Args:
        content: File content bytes

    Returns:
        MIME type string or None if unknown
    """
    for magic, mime_type in MAGIC_SIGNATURES.items():
        if content.startswith(magic):
            return mime_type

    # Special handling for WebP (RIFF....WEBP)
    if content[:4] == b"RIFF" and len(content) > 12 and content[8:12] == b"WEBP":
        return "image/webp"

    # Special handling for WAV (RIFF....WAVE)
    if content[:4] == b"RIFF" and len(content) > 12 and content[8:12] == b"WAVE":
        return "audio/wav"

    # M4A/MP4 audio
    if len(content) > 12 and content[4:8] == b"ftyp":
        return "audio/m4a"

    # WebM (also used for audio)
    if content[:4] == b"\x1a\x45\xdf\xa3":
        return "audio/webm"

    return None


def validate_image_file(content: bytes, filename: str) -> None:
    """
    Validate an image file.

    Args:
        content: File content bytes
        filename: Original filename (for error messages)

    Raises:
        FileTooLargeException: If file exceeds size limit
        InvalidFileTypeException: If file type is not allowed
    """
    # Check size
    if len(content) > settings.max_image_size:
        raise FileTooLargeException(settings.max_image_size // (1024 * 1024))

    # Check type
    detected_type = detect_file_type(content)
    if detected_type not in ALLOWED_IMAGE_TYPES:
        raise InvalidFileTypeException(ALLOWED_IMAGE_TYPES)


def validate_audio_file(content: bytes, filename: str) -> None:
    """
    Validate an audio file.

    Args:
        content: File content bytes
        filename: Original filename

    Raises:
        FileTooLargeException: If file exceeds size limit
        InvalidFileTypeException: If file type is not allowed
    """
    # Check size
    if len(content) > settings.max_audio_size:
        raise FileTooLargeException(settings.max_audio_size // (1024 * 1024))

    # Check type - be more lenient for audio as formats vary
    detected_type = detect_file_type(content)

    # Allow if detected type is in allowed list, or if we can't detect but extension suggests audio
    if detected_type and detected_type in ALLOWED_AUDIO_TYPES:
        return

    # Fallback: check file extension for common audio formats
    ext = filename.lower().split(".")[-1] if "." in filename else ""
    audio_extensions = ["mp3", "wav", "webm", "ogg", "flac", "m4a", "aac", "wma"]

    if ext in audio_extensions:
        return  # Allow based on extension

    raise InvalidFileTypeException(ALLOWED_AUDIO_TYPES)


def validate_file_size(size: int | None, max_size: int) -> None:
    """
    Validate file size from header (Content-Length).

    Args:
        size: File size in bytes (can be None)
        max_size: Maximum allowed size in bytes

    Raises:
        FileTooLargeException: If size exceeds max_size
    """
    if size and size > max_size:
        raise FileTooLargeException(max_size // (1024 * 1024))
