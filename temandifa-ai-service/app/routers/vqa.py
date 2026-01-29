"""
VQA (Visual Question Answering) Router.

Features: rate limiting, caching, and async processing.
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
from app.core.degradation import degradation, get_vqa_fallback
from app.core.exceptions import ModelNotReadyException
from app.core.http.upload import read_and_validate_image
from app.core.infrastructure.grpc_client import ai_client
from app.core.infrastructure.rate_limiter import limiter
from app.core.metrics import track_request
from app.grpc_generated import ai_service_pb2
from app.schemas.vqa import VQAData, VQAResponse

router = APIRouter(prefix="/vqa", tags=["Visual Question Answering"])


@router.post("/", response_model=VQAResponse)
@limiter.limit(f"{settings.rate_limit_requests}/{settings.rate_limit_window}")
@track_request("vqa")
async def ask_question(
    request: Request,
    file: UploadFile = File(...),
    question: str = Form(...),
    _: bool = Depends(verify_api_key),
):
    """
    Ask a question about an image using Visual Question Answering (VQA).

    Uses Google Gemini 1.5 Flash for intelligent image understanding.
    """
    # Validate and read file
    contents = await read_and_validate_image(file)

    # Check cache (include question in key)
    cache_key = generate_cache_key(f"vqa:{question}", contents)
    cached_result = get_cached(cache_key)

    if cached_result:
        logger.info("VQA cache hit", filename=file.filename)
        return VQAResponse(
            filename=file.filename or "unknown",
            data=VQAData(**cached_result),
        )

    # Check if service is unavailable and should use fallback
    if degradation.should_use_fallback("vqa"):
        logger.warning("VQA service degraded, returning fallback")
        return get_vqa_fallback(file.filename or "unknown", question)

    logger.info(
        "Forwarding VQA request to gRPC Worker",
        filename=file.filename,
        size=len(contents),
        question_length=len(question),
    )

    try:
        stub = ai_client.get_stub()
        grpc_request = ai_service_pb2.VQARequest(
            filename=file.filename or "unknown",
            image_data=contents,
            question=question,
        )

        response = await stub.VisualQuestionAnswering(grpc_request)

        if not response.success:
            raise Exception(response.message)

        vqa_data = VQAData(
            question=question,
            answer=response.answer,
        )

        # Cache the result
        set_cached(cache_key, vqa_data.model_dump(), settings.cache_ttl_vqa)

        logger.info(
            "VQA completed",
            filename=file.filename,
            answer_length=len(response.answer),
        )

        # Record success
        degradation.record_success("vqa")

        return VQAResponse(filename=file.filename or "unknown", data=vqa_data)

    except Exception as e:
        # Record failure for graceful degradation
        degradation.record_failure("vqa")
        logger.error("VQA failed", error=str(e))
        raise ModelNotReadyException(f"VQA Worker Error: {str(e)}")


@router.post("/ask", response_model=VQAResponse)
@limiter.limit(f"{settings.rate_limit_requests}/{settings.rate_limit_window}")
@track_request("vqa")
async def ask_about_image(
    request: Request,
    file: UploadFile = File(...),
    question: str = Form(default="Describe this image in detail"),
    _: bool = Depends(verify_api_key),
):
    """
    Alternative endpoint for asking questions about images.
    Defaults to describing the image if no question provided.
    """
    return await ask_question(request, file, question, _)
