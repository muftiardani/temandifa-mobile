from pydantic import BaseModel, Field


class OCRBoundingBox(BaseModel):
    """OCR text bounding box with 4 corner points."""

    top_left: list[float]
    top_right: list[float]
    bottom_right: list[float]
    bottom_left: list[float]

    @classmethod
    def from_flat_list(cls, bbox_flat: list[float]) -> "OCRBoundingBox":
        """
        Create OCRBoundingBox from flat list of coordinates.

        Args:
            bbox_flat: List of 8 floats [tl_x, tl_y, tr_x, tr_y, br_x, br_y, bl_x, bl_y]

        Returns:
            OCRBoundingBox instance
        """
        if len(bbox_flat) >= 8:
            return cls(
                top_left=[bbox_flat[0], bbox_flat[1]],
                top_right=[bbox_flat[2], bbox_flat[3]],
                bottom_right=[bbox_flat[4], bbox_flat[5]],
                bottom_left=[bbox_flat[6], bbox_flat[7]],
            )
        return cls(
            top_left=[0, 0],
            top_right=[0, 0],
            bottom_right=[0, 0],
            bottom_left=[0, 0],
        )


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
