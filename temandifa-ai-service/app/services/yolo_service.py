"""
YOLOv8 Object Detection Service.
Supports GPU/CPU device selection and async inference.
Optimized using ONNX Runtime with GPU batching and memory pooling.
"""

import asyncio
import logging
import os
from concurrent.futures import ThreadPoolExecutor

import numpy as np
import onnxruntime as ort
from tenacity import before_log, retry, stop_after_attempt, wait_exponential

from app.core import logger
from app.core.config import settings
from app.core.metrics import track_inference
from app.utils.preprocessing import letterbox_image, nms, preprocess_image, xywh2xyxy

# Conditional imports for new features
if settings.enable_batching:
    from app.core.performance.batcher import DynamicBatcher

if settings.memory_pool_enabled:
    from app.core.performance.memory_pool import image_buffer


class YoloService:
    """YOLOv8 object detection service using ONNX Runtime."""

    def __init__(self):
        self.session = None
        self.executor = ThreadPoolExecutor(max_workers=settings.ai_worker_threads)
        self.input_name = None
        self.output_names = None
        self.batcher = None

        # COCO Classes (80)
        self.names = [
            "person",
            "bicycle",
            "car",
            "motorcycle",
            "airplane",
            "bus",
            "train",
            "truck",
            "boat",
            "traffic light",
            "fire hydrant",
            "stop sign",
            "parking meter",
            "bench",
            "bird",
            "cat",
            "dog",
            "horse",
            "sheep",
            "cow",
            "elephant",
            "bear",
            "zebra",
            "giraffe",
            "backpack",
            "umbrella",
            "handbag",
            "tie",
            "suitcase",
            "frisbee",
            "skis",
            "snowboard",
            "sports ball",
            "kite",
            "baseball bat",
            "baseball glove",
            "skateboard",
            "surfboard",
            "tennis racket",
            "bottle",
            "wine glass",
            "cup",
            "fork",
            "knife",
            "spoon",
            "bowl",
            "banana",
            "apple",
            "sandwich",
            "orange",
            "broccoli",
            "carrot",
            "hot dog",
            "pizza",
            "donut",
            "cake",
            "chair",
            "couch",
            "potted plant",
            "bed",
            "dining table",
            "toilet",
            "tv",
            "laptop",
            "mouse",
            "remote",
            "keyboard",
            "cell phone",
            "microwave",
            "oven",
            "toaster",
            "sink",
            "refrigerator",
            "book",
            "clock",
            "vase",
            "scissors",
            "teddy bear",
            "hair drier",
            "toothbrush",
        ]

    def load(self):
        """Explicitly load the model."""
        if self.session is None:
            self._load_model()

        # Initialize batcher after model is loaded
        if settings.enable_batching and self.batcher is None:
            self._init_batcher()

    def _init_batcher(self):
        """Initialize dynamic batcher for GPU batch inference."""

        async def batch_process(images: list[bytes]) -> list[list[dict]]:
            loop = asyncio.get_event_loop()
            return await loop.run_in_executor(
                self.executor,
                self._batch_detect,
                images,
            )

        self.batcher = DynamicBatcher(
            process_fn=batch_process,
            max_batch_size=settings.batch_max_size,
            max_wait_ms=settings.batch_wait_ms,
            name="yolo",
        )
        logger.info(
            "YOLO batcher initialized",
            max_batch_size=settings.batch_max_size,
            max_wait_ms=settings.batch_wait_ms,
        )

    @retry(
        stop=stop_after_attempt(settings.warmup_max_retries),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        before=before_log(logging.getLogger("temandifa-ai"), logging.WARNING),
        reraise=True,
    )
    def _load_model(self):
        try:
            device = settings.resolved_yolo_device
            model_path = settings.yolo_model

            # Use quantized model if enabled
            if settings.enable_quantization:
                quantized_path = settings.yolo_model_quantized
                if os.path.exists(quantized_path):
                    model_path = quantized_path
                    logger.info("Using quantized INT8 model", path=model_path)
                else:
                    logger.warning(
                        "Quantized model not found, using standard model",
                        expected_path=quantized_path,
                    )

            # If path is .pt, try to switch to .onnx
            if model_path.endswith(".pt"):
                onnx_path = model_path.replace(".pt", ".onnx")
                model_path = onnx_path

            logger.info("Loading YOLOv8 ONNX model", path=model_path, device=device)

            # Configure providers
            providers = ["CPUExecutionProvider"]
            if device == "cuda":
                providers = ["CUDAExecutionProvider", "CPUExecutionProvider"]
            elif device == "mps":
                providers = ["CPUExecutionProvider"]

            self.session = ort.InferenceSession(model_path, providers=providers)

            self.input_name = self.session.get_inputs()[0].name
            self.output_names = [o.name for o in self.session.get_outputs()]

            logger.info(
                "YOLOv8 ONNX model loaded successfully",
                providers=self.session.get_providers(),
                quantized=settings.enable_quantization,
            )

        except Exception as e:
            logger.error("Failed to load YOLOv8 ONNX model", error=str(e))
            self.session = None
            raise

    def _preprocess_single(self, image_bytes: bytes) -> tuple:
        """Preprocess a single image for inference."""
        # Use memory pool if enabled
        if settings.memory_pool_enabled:
            with image_buffer() as buffer:
                buffer.write(image_bytes)
                buffer.seek(0)
                img0 = preprocess_image(buffer.read())
        else:
            img0 = preprocess_image(image_bytes)

        # Letterbox resizing (to 640x640 default)
        img, ratio, (dw, dh) = letterbox_image(img0, target_size=640)

        # Normalize: HWC to CHW, divide by 255
        img = img.transpose((2, 0, 1))  # HWC to CHW
        img = np.ascontiguousarray(img)
        img = img.astype(np.float32) / 255.0

        return img, img0, ratio, dw, dh

    def _batch_detect(self, images_bytes: list[bytes]) -> list[list[dict]]:
        """
        Detect objects in a batch of images.
        This is more efficient on GPU than processing one at a time.
        """
        if self.session is None:
            self.load()
            if self.session is None:
                raise RuntimeError("YOLOv8 model not loaded")

        batch_size = len(images_bytes)

        # Preprocess all images
        preprocessed = [self._preprocess_single(img) for img in images_bytes]
        imgs = np.stack([p[0] for p in preprocessed], axis=0)  # [N, 3, 640, 640]
        original_data = [(p[1], p[2], p[3], p[4]) for p in preprocessed]

        # Batch inference
        results = self.session.run(self.output_names, {self.input_name: imgs})

        # Postprocess each image
        all_detections = []
        output = results[0]  # [N, 84, 8400]
        output = output.transpose(0, 2, 1)  # [N, 8400, 84]

        for i in range(batch_size):
            img0, ratio, dw, dh = original_data[i]
            detections = self._postprocess(output[i], img0, ratio, dw, dh)
            all_detections.append(detections)

        logger.debug(
            "Batch detection completed",
            batch_size=batch_size,
            total_objects=sum(len(d) for d in all_detections),
        )

        return all_detections

    def _postprocess(
        self,
        prediction: np.ndarray,
        img0: np.ndarray,
        ratio: float,
        dw: float,
        dh: float,
    ) -> list[dict]:
        """Postprocess single image prediction."""
        conf_thres = 0.25

        # Split boxes and scores
        boxes = prediction[:, :4]  # [cx, cy, w, h]
        scores = prediction[:, 4:]  # [80 classes]

        # Get max confidence score and class index for each anchor
        class_ids = np.argmax(scores, axis=1)
        confidences = np.max(scores, axis=1)

        # Filter
        mask = confidences > conf_thres
        boxes = boxes[mask]
        confidences = confidences[mask]
        class_ids = class_ids[mask]

        if len(boxes) == 0:
            return []

        # Convert cxcywh to xyxy
        boxes = xywh2xyxy(boxes)

        # NMS
        indices = nms(boxes, confidences, iou_threshold=0.45)

        final_detections = []
        for i in indices:
            box = boxes[i].copy()
            score = confidences[i]
            cls_id = class_ids[i]

            # Rescale boxes from 640x640 back to original image size
            box[0] -= dw
            box[1] -= dh
            box[2] -= dw
            box[3] -= dh
            box /= ratio

            # Clip to image bounds
            h, w = img0.shape[:2]
            box[0] = max(0, min(box[0], w))
            box[1] = max(0, min(box[1], h))
            box[2] = max(0, min(box[2], w))
            box[3] = max(0, min(box[3], h))

            label = self.names[cls_id] if cls_id < len(self.names) else str(cls_id)

            final_detections.append(
                {
                    "label": label,
                    "confidence": round(float(score), 4),
                    "bbox": [round(float(b), 2) for b in box],
                }
            )

        return final_detections

    def detect_objects(self, image_bytes: bytes) -> list[dict]:
        """
        Detect objects in an image (synchronous).
        """
        if self.session is None:
            self.load()
            if self.session is None:
                raise RuntimeError("YOLOv8 model not loaded")

        # Preprocess
        img, img0, ratio, dw, dh = self._preprocess_single(image_bytes)
        img = np.expand_dims(img, axis=0)  # [1, 3, 640, 640]

        # Inference
        results = self.session.run(self.output_names, {self.input_name: img})

        # Postprocess
        output = results[0]
        output = output.transpose(0, 2, 1)  # [1, 8400, 84]
        prediction = output[0]  # [8400, 84]

        detections = self._postprocess(prediction, img0, ratio, dw, dh)
        logger.debug("Detection completed (ONNX)", count=len(detections))

        return detections

    @track_inference("yolo")
    async def detect_objects_async(self, image_bytes: bytes) -> list[dict]:
        """
        Detect objects in an image (async).
        Uses batching if enabled for better GPU utilization.
        """
        # Use batcher if enabled and available
        if settings.enable_batching and self.batcher is not None:
            return await self.batcher.add(image_bytes)

        # Fallback to single image processing
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            self.executor, self.detect_objects, image_bytes
        )

    def get_status(self) -> dict:
        """Get service status for health checks."""
        return {
            "model_loaded": self.session is not None,
            "batching_enabled": settings.enable_batching,
            "batcher_queue_size": self.batcher.queue_size if self.batcher else 0,
            "quantization_enabled": settings.enable_quantization,
            "memory_pool_enabled": settings.memory_pool_enabled,
        }
