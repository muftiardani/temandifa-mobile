"""
API Key Authentication for AI Service.
Optional security layer for direct access to AI endpoints.
"""

from fastapi import Depends, HTTPException, Security
from fastapi.security import APIKeyHeader

from app.core.config import settings

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


async def verify_api_key(api_key: str | None = Security(api_key_header)) -> bool:
    """
    Verify API key if authentication is enabled.

    Args:
        api_key: API key from X-API-Key header

    Returns:
        True if valid or auth disabled

    Raises:
        HTTPException: If API key is invalid
    """
    # Skip validation if API key auth is disabled
    if not settings.api_key_enabled:
        return True

    # Require API key when enabled
    if not api_key:
        raise HTTPException(
            status_code=401,
            detail={
                "status": "error",
                "error": {
                    "code": "MISSING_API_KEY",
                    "message": "API key is required. Provide X-API-Key header.",
                },
            },
        )

    # Validate API key
    if api_key != settings.api_key:
        raise HTTPException(
            status_code=401,
            detail={
                "status": "error",
                "error": {"code": "INVALID_API_KEY", "message": "Invalid API key."},
            },
        )

    return True


# Dependency for protected routes
require_api_key = Depends(verify_api_key)
