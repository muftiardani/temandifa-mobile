"""
Shared helper functions for routers.
Eliminates code duplication across detection, OCR, and batch routers.
"""

from app.schemas.detection import Detection, DetectionData
from app.schemas.ocr import OCRBoundingBox, OCRData, OCRLine


def parse_detection_objects(objects: list) -> list[dict]:
    """
    Parse gRPC detection response objects to list of dicts.

    Args:
        objects: List of DetectedObject from gRPC response

    Returns:
        List of detection dicts with label, confidence, bbox
    """
    detections = []
    for obj in objects:
        detections.append(
            {
                "label": obj.label,
                "confidence": round(obj.confidence, 4),
                "bbox": list(obj.bbox),
            }
        )
    return detections


def create_detection_data(
    detections: list[dict], language: str = "en"
) -> DetectionData:
    """
    Create DetectionData from list of detection dicts.

    Args:
        detections: List of detection dicts
        language: Language code for labels

    Returns:
        DetectionData instance
    """
    detection_models = [Detection(**d) for d in detections]
    return DetectionData(
        language=language,
        count=len(detection_models),
        detections=detection_models,
    )


def parse_ocr_lines(lines: list) -> list[OCRLine]:
    """
    Parse gRPC OCR response lines to list of OCRLine.

    Args:
        lines: List of OCRLine from gRPC response

    Returns:
        List of OCRLine instances
    """
    parsed_lines = []
    for line in lines:
        bbox_obj = OCRBoundingBox.from_flat_list(list(line.bbox))
        parsed_lines.append(
            OCRLine(text=line.text, confidence=line.confidence, bbox=bbox_obj)
        )
    return parsed_lines


def create_ocr_data(response, language: str) -> OCRData:
    """
    Create OCRData from gRPC OCR response.

    Args:
        response: gRPC OCRResponse
        language: Language code used for OCR

    Returns:
        OCRData instance
    """
    lines = parse_ocr_lines(response.lines)
    return OCRData(
        full_text=response.full_text,
        word_count=len(response.full_text.split()) if response.full_text else 0,
        line_count=len(lines),
        language=language,
        lines=lines,
    )
