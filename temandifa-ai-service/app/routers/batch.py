"""
Batch processing router for multiple file processing.
Enhanced with parallel processing using asyncio.gather.
"""

import asyncio

from fastapi import APIRouter, File, Query, UploadFile
from pydantic import BaseModel

from app.core import logger, validate_file_size, validate_image_file
from app.core.config import settings
from app.core.metrics import track_request
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

        detections = []
        for obj in response.objects:
            detections.append(
                {
                    "label": obj.label,
                    "confidence": round(obj.confidence, 4),
                    "bbox": list(obj.bbox),
                }
            )

        if language and language != "en":
            detections = translate_detections(detections, language)

        return BatchDetectionResult(
            filename=file.filename,
            status="success",
            data=DetectionResponse(
                status="success",
                filename=file.filename,
                language=language,
                count=len(detections),
                data=detections,
            ),
        )
    except Exception as e:
        logger.error(f"Detection failed for {file.filename}: {e}")
        return BatchDetectionResult(
            filename=file.filename, status="error", error=str(e)
        )


@router.post("/detect/batch", response_model=BatchDetectionResponse)
@track_request("detect_batch")
async def detect_batch(
    files: list[UploadFile] = File(...),
    language: str = Query(default="id", description="Language for labels"),
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
            tasks.append(
                asyncio.coroutine(
                    lambda f=file, err=e: BatchDetectionResult(
                        filename=f.filename, status="error", error=str(err)
                    )
                )()
            )

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
    from app.schemas.ocr import OCRBoundingBox, OCRData, OCRLine

    try:
        stub = ai_client.get_stub()
        grpc_request = ai_service_pb2.OCRRequest(
            filename=file.filename or "unknown", image_data=content, language=languages
        )
        response = await stub.ExtractText(grpc_request)

        if not response.success:
            raise Exception(response.message)

        lines = []
        for line in response.lines:
            bbox_flat = list(line.bbox)
            if len(bbox_flat) >= 8:
                bbox_obj = OCRBoundingBox(
                    top_left=[bbox_flat[0], bbox_flat[1]],
                    top_right=[bbox_flat[2], bbox_flat[3]],
                    bottom_right=[bbox_flat[4], bbox_flat[5]],
                    bottom_left=[bbox_flat[6], bbox_flat[7]],
                )
            else:
                bbox_obj = OCRBoundingBox(
                    top_left=[0, 0],
                    top_right=[0, 0],
                    bottom_right=[0, 0],
                    bottom_left=[0, 0],
                )

            lines.append(
                OCRLine(text=line.text, confidence=line.confidence, bbox=bbox_obj)
            )

        ocr_data = OCRData(
            full_text=response.full_text,
            word_count=len(response.full_text.split()) if response.full_text else 0,
            line_count=len(lines),
            language=languages,
            lines=lines,
        )

        return BatchOCRResult(
            filename=file.filename,
            status="success",
            data=OCRResponse(filename=file.filename, data=ocr_data),
        )
    except Exception as e:
        logger.error(f"OCR failed for {file.filename}: {e}")
        return BatchOCRResult(filename=file.filename, status="error", error=str(e))


@router.post("/ocr/batch", response_model=BatchOCRResponse)
@track_request("ocr_batch")
async def ocr_batch(
    files: list[UploadFile] = File(...),
    languages: str = Query(default="en", description="OCR languages (en, ch, id)"),
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
            tasks.append(process_single_ocr(file, content, languages))
        except Exception as e:
            tasks.append(
                asyncio.coroutine(
                    lambda f=file, err=e: BatchOCRResult(
                        filename=f.filename, status="error", error=str(err)
                    )
                )()
            )

    # Execute all tasks in parallel
    results = await asyncio.gather(*tasks, return_exceptions=False)

    successful = sum(1 for r in results if r.status == "success")
    failed = len(results) - successful

    return BatchOCRResponse(
        total_files=len(files), successful=successful, failed=failed, results=results
    )
