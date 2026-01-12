"""
Image preprocessing utilities for memory optimization.
Uses OpenCV for faster processing (2-3x faster than PIL).
Falls back to PIL if OpenCV is not available.
"""

import io

import numpy as np

from app.core.config import settings
from app.core.logging import logger

try:
    import cv2

    OPENCV_AVAILABLE = True
except ImportError:
    OPENCV_AVAILABLE = False
    logger.info("OpenCV not available, using PIL for image preprocessing")


def preprocess_image(content: bytes, max_dimension: int | None = None) -> np.ndarray:
    """
    Preprocess image to reduce memory usage and prepare for inference.
    Uses OpenCV for faster processing when available.

    - Resizes images larger than max_dimension
    - Maintains aspect ratio
    - Returns RGB NumPy array (ready for inference)

    Args:
        content: Raw image bytes
        max_dimension: Max width/height (default from settings)

    Returns:
        RGB NumPy array
    """
    if max_dimension is None:
        max_dimension = settings.max_image_dimension

    if OPENCV_AVAILABLE:
        return _preprocess_opencv(content, max_dimension)
    else:
        return _preprocess_pil(content, max_dimension)


def _preprocess_opencv(content: bytes, max_dimension: int) -> np.ndarray:
    try:
        nparr = np.frombuffer(content, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            logger.warning("OpenCV failed to decode image, falling back to PIL")
            return _preprocess_pil(content, max_dimension)

        height, width = img.shape[:2]
        original_size = (width, height)

        # Check if resize is needed
        if max(width, height) > max_dimension:
            if width > height:
                new_width = max_dimension
                new_height = int(height * (max_dimension / width))
            else:
                new_height = max_dimension
                new_width = int(width * (max_dimension / height))

            # Resize using INTER_AREA for downscaling (best quality)
            img = cv2.resize(img, (new_width, new_height), interpolation=cv2.INTER_AREA)

            logger.debug(
                "Image resized (OpenCV)",
                original=f"{original_size[0]}x{original_size[1]}",
                new=f"{new_width}x{new_height}",
            )

        # Convert BGR (OpenCV default) to RGB (Model expectation)
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        return img

    except Exception as e:
        logger.warning(f"OpenCV preprocessing failed, using PIL fallback: {e}")
        return _preprocess_pil(content, max_dimension)


def _preprocess_pil(content: bytes, max_dimension: int) -> np.ndarray:
    """PIL-based preprocessing (fallback). Returns RGB array."""
    try:
        from PIL import Image as PILImage

        img = PILImage.open(io.BytesIO(content))

        if img.mode != "RGB":
            img = img.convert("RGB")

        original_size = img.size

        if max(img.size) > max_dimension:
            img.thumbnail((max_dimension, max_dimension), PILImage.LANCZOS)

            logger.debug(
                "Image resized (PIL)",
                original=f"{original_size[0]}x{original_size[1]}",
                new=f"{img.size[0]}x{img.size[1]}",
            )

        return np.array(img)

    except Exception as e:
        logger.error(f"PIL preprocessing failed: {e}")
        raise ValueError("Invalid image format")


def get_image_info(content: bytes) -> dict:
    """
    Get image information without full processing.

    Args:
        content: Raw image bytes

    Returns:
        Dict with format, size, mode
    """
    if OPENCV_AVAILABLE:
        try:
            nparr = np.frombuffer(content, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if img is not None:
                height, width = img.shape[:2]
                return {
                    "format": "detected",
                    "size": (width, height),
                    "mode": "BGR",
                    "bytes": len(content),
                }
        except Exception:
            pass

    # Fallback to PIL
    try:
        from PIL import Image as PILImage

        img = PILImage.open(io.BytesIO(content))
        return {
            "format": img.format,
            "size": img.size,
            "mode": img.mode,
            "bytes": len(content),
        }
    except Exception:
        return {"error": "Cannot read image info"}


def letterbox_image(
    image: np.ndarray, target_size: int = 640
) -> tuple[np.ndarray, float, tuple[float, float]]:
    """
    Resize image to target_size maintaining aspect ratio using padding (Letterbox).
    Required for YOLO inference.

    Returns:
        padded_image: Resized and padded image
        ratio: Scale ratio (new / old)
        (dw, dh): Padding values
    """
    shape = image.shape[:2]  # current shape [height, width]
    new_shape = target_size

    # Scale ratio (new / old)
    r = min(new_shape / shape[0], new_shape / shape[1])

    # Compute padding
    ratio = r, r  # width, height ratios
    new_unpad = int(round(shape[1] * r)), int(round(shape[0] * r))
    dw, dh = new_shape - new_unpad[0], new_shape - new_unpad[1]  # wh padding

    dw /= 2  # divide padding into 2 sides
    dh /= 2

    if shape[::-1] != new_unpad:  # resize
        if OPENCV_AVAILABLE:
            image = cv2.resize(image, new_unpad, interpolation=cv2.INTER_LINEAR)
        else:
            # Fallback (assuming image passed here is numpy array from PIL)
            import PIL.Image

            pil_img = PIL.Image.fromarray(image)
            pil_img = pil_img.resize(new_unpad, PIL.Image.BILINEAR)
            image = np.array(pil_img)

    top, bottom = int(round(dh - 0.1)), int(round(dh + 0.1))
    left, right = int(round(dw - 0.1)), int(round(dw + 0.1))

    if OPENCV_AVAILABLE:
        image = cv2.copyMakeBorder(
            image, top, bottom, left, right, cv2.BORDER_CONSTANT, value=(114, 114, 114)
        )  # add border
    else:
        # Simple padding with numpy
        image = np.pad(
            image,
            ((top, bottom), (left, right), (0, 0)),
            mode="constant",
            constant_values=114,
        )

    return image, r, (dw, dh)


def xywh2xyxy(x: np.ndarray) -> np.ndarray:
    """Convert nx4 boxes from [x, y, w, h] to [x1, y1, x2, y2] where xy1=top-left, xy2=bottom-right"""
    y = np.copy(x)
    y[..., 0] = x[..., 0] - x[..., 2] / 2  # top left x
    y[..., 1] = x[..., 1] - x[..., 3] / 2  # top left y
    y[..., 2] = x[..., 0] + x[..., 2] / 2  # bottom right x
    y[..., 3] = x[..., 1] + x[..., 3] / 2  # bottom right y
    return y


def nms(
    boxes: np.ndarray, scores: np.ndarray, iou_threshold: float = 0.45
) -> list[int]:
    """
    Non-Maximum Suppression (NMS) to remove overlapping bounding boxes.
    Returns: List of indices to keep.
    """
    x1 = boxes[:, 0]
    y1 = boxes[:, 1]
    x2 = boxes[:, 2]
    y2 = boxes[:, 3]

    areas = (x2 - x1) * (y2 - y1)
    order = scores.argsort()[::-1]

    keep = []
    while order.size > 0:
        i = order[0]
        keep.append(i)

        xx1 = np.maximum(x1[i], x1[order[1:]])
        yy1 = np.maximum(y1[i], y1[order[1:]])
        xx2 = np.minimum(x2[i], x2[order[1:]])
        yy2 = np.minimum(y2[i], y2[order[1:]])

        w = np.maximum(0.0, xx2 - xx1)
        h = np.maximum(0.0, yy2 - yy1)
        inter = w * h
        ovr = inter / (areas[i] + areas[order[1:]] - inter)

        inds = np.where(ovr <= iou_threshold)[0]
        order = order[inds + 1]

    return keep
