from pydantic import BaseModel, Field


class OCRBoundingBox(BaseModel):
    """OCR text bounding box with 4 corner points."""

    top_left: list[float]
    top_right: list[float]
    bottom_right: list[float]
    bottom_left: list[float]


class OCRLine(BaseModel):
    """Single line of extracted text."""

    text: str
    confidence: float = Field(..., ge=0, le=1)
    bbox: OCRBoundingBox


class OCRData(BaseModel):
    """OCR extraction result data."""

    full_text: str
    word_count: int
    line_count: int
    language: str
    lines: list[OCRLine]


class OCRResponse(BaseModel):
    """Response for /ocr endpoint."""

    status: str = "success"
    filename: str
    data: OCRData
    is_fallback: bool = False
