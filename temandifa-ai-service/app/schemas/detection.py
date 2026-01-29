from pydantic import BaseModel, Field


class Detection(BaseModel):
    """Single object detection result."""

    label: str = Field(..., description="Object label (translated if requested)")
    label_original: str | None = Field(None, description="Original English label")
    confidence: float = Field(..., ge=0, le=1, description="Detection confidence 0-1")
    bbox: list[float] = Field(..., description="Bounding box [x1, y1, x2, y2]")


class DetectionData(BaseModel):
    """Detection result data wrapper for consistency with other schemas."""

    language: str = Field("en", description="Language for labels")
    count: int = Field(..., description="Number of detected objects")
    detections: list[Detection] = Field(..., description="List of detected objects")


class DetectionResponse(BaseModel):
    """Response for /detect endpoint."""

    status: str = "success"
    filename: str
    data: DetectionData
    is_fallback: bool = False
