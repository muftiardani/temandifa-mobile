from pydantic import BaseModel, Field


class BoundingBox(BaseModel):
    """Bounding box coordinates [x1, y1, x2, y2]."""

    x1: float
    y1: float
    x2: float
    y2: float


class Detection(BaseModel):
    """Single object detection result."""

    label: str = Field(..., description="Object label (translated if requested)")
    label_original: str | None = Field(None, description="Original English label")
    confidence: float = Field(..., ge=0, le=1, description="Detection confidence 0-1")
    bbox: list[float] = Field(..., description="Bounding box [x1, y1, x2, y2]")


class DetectionResponse(BaseModel):
    """Response for /detect endpoint."""

    status: str = "success"
    filename: str
    language: str
    count: int
    data: list[Detection]
    is_fallback: bool = False
