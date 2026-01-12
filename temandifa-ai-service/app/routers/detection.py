"""
Object Detection Router with rate limiting, caching, and async processing.
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
from app.core.degradation import degradation, get_detection_fallback
from app.core.exceptions import ModelNotReadyException
from app.core.http.upload import read_and_validate_image
from app.core.infrastructure.grpc_client import ai_client
from app.core.infrastructure.rate_limiter import limiter
from app.core.metrics import track_request
from app.grpc_generated import ai_service_pb2
from app.schemas.detection import Detection, DetectionResponse
from app.utils.translations import translate_detections

router = APIRouter(prefix="/detect", tags=["Object Detection"])


@router.post("/", response_model=DetectionResponse)
@limiter.limit(f"{settings.rate_limit_requests}/{settings.rate_limit_window}")
@track_request("detect")
async def detect_objects(
    request: Request,
    file: UploadFile = File(...),
    language: str | None = Form(default="en"),
    _: bool = Depends(verify_api_key),
):
    """
    Detect objects in an uploaded image using YOLOv8 via gRPC.
    """
    # Validate and read file
    contents = await read_and_validate_image(file)

    # Check cache first
    cache_key = generate_cache_key("detect", contents)
    cached_result = get_cached(cache_key)

    if cached_result:
        logger.info("Detection cache hit", filename=file.filename)
        detections = cached_result.get("detections", [])

        if language and language != "en":
            detections = translate_detections(detections, language)

        detection_models = [Detection(**d) for d in detections]
        return DetectionResponse(
            filename=file.filename or "unknown",
            language=language,
            count=len(detection_models),
            data=detection_models,
        )

    # Check if service is unavailable and should use fallback
    if degradation.should_use_fallback("detection"):
        logger.warning("Detection service degraded, returning fallback")
        return get_detection_fallback(file.filename or "unknown")

    logger.info(
        "Forwarding detection request to gRPC Worker",
        filename=file.filename,
        size=len(contents),
    )

    try:
        stub = ai_client.get_stub()
        grpc_request = ai_service_pb2.ImageRequest(
            filename=file.filename or "unknown", image_data=contents
        )

        response = await stub.DetectObjects(grpc_request)

        if not response.success:
            raise Exception(response.message)

        detections = []
        for obj in response.objects:
            detections.append(
                {
                    "label": obj.label,
                    "confidence": round(obj.confidence, 4),
                    "bbox": list(obj.bbox),
                }
            )

        set_cached(
            cache_key, {"detections": detections}, settings.cache_ttl_detection
        )

        if language and language != "en":
            detections = translate_detections(detections, language)

        detection_models = [Detection(**d) for d in detections]

        # Record success
        degradation.record_success("detection")

        return DetectionResponse(
            filename=file.filename or "unknown",
            language=language,
            count=len(detection_models),
            data=detection_models,
        )

    except Exception as e:
        # Record failure for graceful degradation
        degradation.record_failure("detection")
        logger.error("Detection failed", error=str(e))
        raise ModelNotReadyException(f"Detection Worker Error: {str(e)}")
