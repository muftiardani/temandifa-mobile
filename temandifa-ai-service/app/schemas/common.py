from pydantic import BaseModel, Field


class ModelStatus(BaseModel):
    """Status of individual AI models."""

    yolo: bool = False
    ocr: bool = False
    whisper: bool = False
    vqa: bool = False


class HealthResponse(BaseModel):
    """Response for /health endpoint."""

    status: str = Field(..., description="'healthy' or 'degraded'")
    models: ModelStatus
    versions: dict[str, str]
    ready_count: str
