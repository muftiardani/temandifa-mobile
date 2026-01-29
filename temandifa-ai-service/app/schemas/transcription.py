from pydantic import BaseModel, Field


class TranscriptionData(BaseModel):
    """Transcription result data."""

    text: str = Field(..., description="Transcribed text")
    language: str = Field(..., description="Detected language")
    duration: float = Field(0.0, description="Audio duration in seconds")


class TranscriptionResponse(BaseModel):
    """Response for /transcribe endpoint."""

    status: str = "success"
    filename: str
    data: TranscriptionData
    is_fallback: bool = False
