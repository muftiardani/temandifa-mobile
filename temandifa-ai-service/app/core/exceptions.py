"""
Custom exception classes for the AI Service.
Provides structured error handling with error codes.
"""

from fastapi import Request
from fastapi.responses import JSONResponse


class AIServiceException(Exception):
    """Base exception for AI Service errors."""

    def __init__(self, message: str, code: str, status_code: int = 500):
        self.message = message
        self.code = code
        self.status_code = status_code
        super().__init__(self.message)


class ModelNotReadyException(AIServiceException):
    """Raised when an AI model is not loaded or ready."""

    def __init__(self, model_name: str = "unknown"):
        super().__init__(
            message=f"Model '{model_name}' is not ready. Please try again later.",
            code="MODEL_NOT_READY",
            status_code=503,
        )


class ValidationException(AIServiceException):
    """Raised for input validation errors."""

    def __init__(self, message: str):
        super().__init__(message=message, code="VALIDATION_ERROR", status_code=400)


class FileTooLargeException(AIServiceException):
    """Raised when uploaded file exceeds size limit."""

    def __init__(self, max_size_mb: int):
        super().__init__(
            message=f"File too large. Maximum size is {max_size_mb}MB.",
            code="FILE_TOO_LARGE",
            status_code=413,
        )


class InvalidFileTypeException(AIServiceException):
    """Raised when file type is not allowed."""

    def __init__(self, allowed_types: list[str]):
        super().__init__(
            message=f"Invalid file type. Allowed types: {', '.join(allowed_types)}",
            code="INVALID_FILE_TYPE",
            status_code=400,
        )


# Exception handlers for FastAPI
async def ai_service_exception_handler(request: Request, exc: AIServiceException):
    """Handle AIServiceException and return structured JSON response."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "status": "error",
            "error": {"code": exc.code, "message": exc.message},
        },
    )
