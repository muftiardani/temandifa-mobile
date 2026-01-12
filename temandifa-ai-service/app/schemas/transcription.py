from pydantic import BaseModel


class TranscriptionData(BaseModel):
    """Transcription result data."""

    text: str
    language: str


class TranscriptionResponse(BaseModel):
    """Response for /transcribe endpoint."""

    status: str = "success"
    filename: str
    data: TranscriptionData
    is_fallback: bool = False
