"""VQA (Visual Question Answering) Pydantic schemas."""

from pydantic import BaseModel, Field


class VQAData(BaseModel):
    """VQA response data."""

    question: str = Field(..., description="The question asked")
    answer: str = Field(..., description="AI-generated answer")


class VQAResponse(BaseModel):
    """VQA API response."""

    status: str = Field("success", description="Response status")
    filename: str = Field(..., description="Original filename")
    data: VQAData = Field(..., description="VQA result data")
    is_fallback: bool = Field(False, description="Whether this is a fallback response")
