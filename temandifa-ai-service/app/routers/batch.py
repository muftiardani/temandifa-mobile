"""
Batch processing router for multiple file processing.
Enhanced with parallel processing using asyncio.gather.
"""

import asyncio

from fastapi import APIRouter, Depends, File, Query, Request, UploadFile
from pydantic import BaseModel

from app.core import (
    logger,
    settings,
    validate_file_size,
    validate_image_file,
    verify_api_key,
)
from app.core.infrastructure.rate_limiter import limiter
from app.core.metrics import track_request
from app.routers.helpers import (
    create_detection_data,
    create_ocr_data,
    parse_detection_objects,
)
from app.schemas.detection import DetectionResponse
from app.schemas.ocr import OCRResponse

router = APIRouter(tags=["Batch Processing"])


class BatchDetectionResult(BaseModel):
    """Result for a single file in batch detection."""

    filename: str
    status: str
    data: DetectionResponse | dict | None = None
    error: str | None = None


class BatchDetectionResponse(BaseModel):
    """Response for batch detection."""

    status: str = "success"
    total_files: int
    successful: int
    failed: int
    results: list[BatchDetectionResult]


async def process_single_detection(
    file: UploadFile, content: bytes, language: str
) -> BatchDetectionResult:
    """
    Process a single detection request.
    Designed for parallel execution.
    """
    from app.core.infrastructure.grpc_client import ai_client
    from app.grpc_generated import ai_service_pb2
    from app.utils.translations import translate_detections

    try:
        stub = ai_client.get_stub()
        grpc_request = ai_service_pb2.ImageRequest(
            filename=file.filename or "unknown", image_data=content
        )
        response = await stub.DetectObjects(grpc_request)

        if not response.success:
            raise Exception(response.message)

        # Use helper function to parse detection objects
        detections = parse_detection_objects(response.objects)

        if language and language != "en":
            detections = translate_detections(detections, language)

        # Use helper function to create DetectionData
        detection_data = create_detection_data(detections, language)

        return BatchDetectionResult(
            filename=file.filename,
            status="success",
            data=DetectionResponse(
                status="success",
                filename=file.filename or "unknown",
                data=detection_data,
            ),
        )
    except Exception as e:
        logger.error("Batch detection failed", filename=file.filename, error=str(e))
        return BatchDetectionResult(
            filename=file.filename, status="error", error=str(e)
        )


@router.post("/detect/batch", response_model=BatchDetectionResponse)
@limiter.limit(f"{settings.rate_limit_requests}/{settings.rate_limit_window}")
@track_request("detect_batch")
async def detect_batch(
    request: Request,
    files: list[UploadFile] = File(...),
    language: str = Query(default="en", description="Language for labels"),
    _: bool = Depends(verify_api_key),
):
    """
    Batch object detection for multiple images.
    Uses parallel processing with asyncio.gather for improved performance.

    - Maximum files: configured in settings (default 10)
    - Returns individual results for each file
    """
    if len(files) > settings.max_batch_size:
        files = files[: settings.max_batch_size]
        logger.warning(f"Batch size limited to {settings.max_batch_size} files")

    # Pre-validate and read all files
    tasks = []
    for file in files:
        try:
            validate_file_size(file.size, settings.max_image_size)
            content = await file.read()
            validate_image_file(content, file.filename)
            tasks.append(process_single_detection(file, content, language))
        except Exception as e:
            # Create failed result immediately for validation errors
            async def make_error_detection(f=file, err=e):
                return BatchDetectionResult(
                    filename=f.filename, status="error", error=str(err)
                )

            tasks.append(make_error_detection())

    # Execute all tasks in parallel
    results = await asyncio.gather(*tasks, return_exceptions=False)

    successful = sum(1 for r in results if r.status == "success")
    failed = len(results) - successful

    return BatchDetectionResponse(
        total_files=len(files), successful=successful, failed=failed, results=results
    )


class BatchOCRResult(BaseModel):
    """Result for a single file in batch OCR."""

    filename: str
    status: str
    data: OCRResponse | dict | None = None
    error: str | None = None


class BatchOCRResponse(BaseModel):
    """Response for batch OCR."""

    status: str = "success"
    total_files: int
    successful: int
    failed: int
    results: list[BatchOCRResult]


async def process_single_ocr(
    file: UploadFile, content: bytes, languages: str
) -> BatchOCRResult:
    """
    Process a single OCR request.
    Designed for parallel execution.
    """
    from app.core.infrastructure.grpc_client import ai_client
    from app.grpc_generated import ai_service_pb2

    try:
        stub = ai_client.get_stub()
        grpc_request = ai_service_pb2.OCRRequest(
            filename=file.filename or "unknown",
            image_data=content,
            language=languages,
        )
        response = await stub.ExtractText(grpc_request)

        if not response.success:
            raise Exception(response.message)

        # Use helper function to create OCRData
        ocr_data = create_ocr_data(response, languages)

        return BatchOCRResult(
            filename=file.filename,
            status="success",
            data=OCRResponse(filename=file.filename or "unknown", data=ocr_data),
        )
    except Exception as e:
        logger.error("Batch OCR failed", filename=file.filename, error=str(e))
        return BatchOCRResult(filename=file.filename, status="error", error=str(e))


@router.post("/ocr/batch", response_model=BatchOCRResponse)
@limiter.limit(f"{settings.rate_limit_requests}/{settings.rate_limit_window}")
@track_request("ocr_batch")
async def ocr_batch(
    request: Request,
    files: list[UploadFile] = File(...),
    language: str = Query(default="en", description="OCR language (en, ch, id)"),
    _: bool = Depends(verify_api_key),
):
    """
    Batch OCR for multiple images.
    Uses parallel processing with asyncio.gather for improved performance.

    - Maximum files: configured in settings (default 10)
    - Returns individual results for each file
    """
    if len(files) > settings.max_batch_size:
        files = files[: settings.max_batch_size]

    # Pre-validate and read all files
    tasks = []
    for file in files:
        try:
            validate_file_size(file.size, settings.max_image_size)
            content = await file.read()
            validate_image_file(content, file.filename)
            tasks.append(process_single_ocr(file, content, language))
        except Exception as e:
            # Create failed result immediately for validation errors
            async def make_error_ocr(f=file, err=e):
                return BatchOCRResult(
                    filename=f.filename, status="error", error=str(err)
                )

            tasks.append(make_error_ocr())

    # Execute all tasks in parallel
    results = await asyncio.gather(*tasks, return_exceptions=False)

    successful = sum(1 for r in results if r.status == "success")
    failed = len(results) - successful

    return BatchOCRResponse(
        total_files=len(files), successful=successful, failed=failed, results=results
    )
