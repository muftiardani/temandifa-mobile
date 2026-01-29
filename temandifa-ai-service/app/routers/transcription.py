"""
Transcription Router with rate limiting, caching, and async processing.
"""

from fastapi import APIRouter, Depends, File, Request, UploadFile

from app.core import (
    generate_cache_key,
    get_cached,
    logger,
    set_cached,
    settings,
    verify_api_key,
)
from app.core.degradation import degradation, get_transcription_fallback
from app.core.exceptions import ModelNotReadyException
from app.core.http.upload import read_and_validate_audio
from app.core.infrastructure.grpc_client import ai_client
from app.core.infrastructure.rate_limiter import limiter
from app.core.metrics import track_request
from app.grpc_generated import ai_service_pb2
from app.schemas.transcription import TranscriptionData, TranscriptionResponse

router = APIRouter(prefix="/transcribe", tags=["Transcription"])


@router.post("/", response_model=TranscriptionResponse)
@limiter.limit(f"{settings.rate_limit_requests}/{settings.rate_limit_window}")
@track_request("transcribe")
async def transcribe_audio(
    request: Request,
    file: UploadFile = File(...),
    _: bool = Depends(verify_api_key),
):
    """
    Transcribe audio to text using Whisper (processed via internal gRPC).
    """
    # Validate and read file
    contents, filename = await read_and_validate_audio(file)

    # Check cache
    cache_key = generate_cache_key("transcribe", contents)
    cached_result = get_cached(cache_key)

    if cached_result:
        logger.info("Transcription cache hit", filename=filename)
        return TranscriptionResponse(
            filename=filename, data=TranscriptionData(**cached_result)
        )

    # Check if service is unavailable and should use fallback
    if degradation.should_use_fallback("transcription"):
        logger.warning("Transcription service degraded, returning fallback")
        return get_transcription_fallback(filename)

    logger.info(
        "Forwarding transcription request to gRPC Worker",
        filename=filename,
        size=len(contents),
    )

    try:
        stub = ai_client.get_stub()
        grpc_request = ai_service_pb2.AudioRequest(
            filename=filename, audio_data=contents
        )

        response = await stub.TranscribeAudio(grpc_request)

        if not response.success:
            raise Exception(f"Transcription failed: {response.text}")

        transcription_data = TranscriptionData(
            text=response.text,
            language=response.language,
            duration=response.duration,
        )

        set_cached(
            cache_key, transcription_data.model_dump(), settings.cache_ttl_transcription
        )

        logger.info(
            "Transcription completed",
            filename=filename,
            language=response.language,
            text_length=len(response.text),
        )

        # Record success
        degradation.record_success("transcription")

        return TranscriptionResponse(filename=filename, data=transcription_data)

    except Exception as e:
        # Record failure for graceful degradation
        degradation.record_failure("transcription")
        logger.error("Transcription failed", error=str(e))
        raise ModelNotReadyException(f"Transcription Worker Error: {str(e)}")
