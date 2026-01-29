"""
OCR Router with rate limiting, caching, and async processing.
"""

from fastapi import APIRouter, Depends, File, Form, Request, UploadFile

from app.core import (
    generate_cache_key,
    get_cached,
    logger,
    set_cached,
    settings,
    verify_api_key,
)
from app.core.degradation import degradation, get_ocr_fallback
from app.core.exceptions import ModelNotReadyException
from app.core.http.upload import read_and_validate_image
from app.core.infrastructure.grpc_client import ai_client
from app.core.infrastructure.rate_limiter import limiter
from app.core.metrics import track_request
from app.grpc_generated import ai_service_pb2
from app.routers.helpers import create_ocr_data
from app.schemas.ocr import OCRData, OCRResponse

router = APIRouter(prefix="/ocr", tags=["OCR"])


@router.post("/", response_model=OCRResponse)
@limiter.limit(f"{settings.rate_limit_requests}/{settings.rate_limit_window}")
@track_request("ocr")
async def extract_text(
    request: Request,
    file: UploadFile = File(...),
    language: str = Form(default="en"),
    _: bool = Depends(verify_api_key),
):
    """
    Extract text from an image using OCR (processed via internal gRPC).
    """
    # Validate and read file
    contents = await read_and_validate_image(file)

    # Check cache (include lang in key since results differ by language)
    cache_key = generate_cache_key(f"ocr:{language}", contents)
    cached_result = get_cached(cache_key)

    if cached_result:
        logger.info("OCR cache hit", filename=file.filename)
        return OCRResponse(
            filename=file.filename or "unknown", data=OCRData(**cached_result)
        )

    # Check if service is unavailable and should use fallback
    if degradation.should_use_fallback("ocr"):
        logger.warning("OCR service degraded, returning fallback")
        return get_ocr_fallback(file.filename or "unknown")

    logger.info(
        "Forwarding OCR request to gRPC Worker",
        filename=file.filename,
        size=len(contents),
        language=language,
    )

    try:
        stub = ai_client.get_stub()
        grpc_request = ai_service_pb2.OCRRequest(
            filename=file.filename or "unknown", image_data=contents, language=language
        )

        response = await stub.ExtractText(grpc_request)

        if not response.success:
            raise Exception(response.message)

        # Use helper to create OCRData
        ocr_data = create_ocr_data(response, language)

        set_cached(cache_key, ocr_data.model_dump(), settings.cache_ttl_ocr)

        # Record success
        degradation.record_success("ocr")

        return OCRResponse(filename=file.filename or "unknown", data=ocr_data)

    except Exception as e:
        # Record failure for graceful degradation
        degradation.record_failure("ocr")
        logger.error("OCR failed", error=str(e))
        raise ModelNotReadyException(f"OCR Worker Error: {str(e)}")
