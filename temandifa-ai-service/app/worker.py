"""
gRPC Worker for AI Service.
Runs in a separate process for model isolation.
Enhanced with graceful shutdown, request ID tracing, and health status reporting.
"""

import asyncio
import glob
import os
import signal
import tempfile

import grpc

from app.core import logger
from app.grpc_generated import ai_service_pb2, ai_service_pb2_grpc
from app.services.ocr_service import OCRService
from app.services.transcription_service import TranscriptionService
from app.services.vqa_service import VQAService
from app.services.yolo_service import YoloService

# Global state for graceful shutdown
_shutdown_event = asyncio.Event()
_server = None

# Model status tracking for health checks
model_status = {
    "yolo": {"ready": False, "error": None},
    "ocr": {"ready": False, "error": None},
    "whisper": {"ready": False, "error": None},
    "vqa": {"ready": False, "error": None},
}


class AIService(ai_service_pb2_grpc.AIServiceServicer):
    """
    gRPC Implementation of AI Service.
    Wraps existing services: YOLO, OCR, Whisper, VQA.
    Supports request ID tracing via gRPC metadata.
    """

    def __init__(
        self,
        yolo_service: YoloService,
        ocr_service: OCRService,
        transcription_service: TranscriptionService,
        vqa_service: VQAService,
    ):
        self.yolo_service = yolo_service
        self.ocr_service = ocr_service
        self.transcription_service = transcription_service
        self.vqa_service = vqa_service

    def _get_request_id(self, context: grpc.aio.ServicerContext) -> str:
        """Extract request ID from gRPC metadata for tracing."""
        metadata = dict(context.invocation_metadata())
        return metadata.get("x-request-id", "-")

    async def DetectObjects(
        self, request: ai_service_pb2.ImageRequest, context: grpc.aio.ServicerContext
    ) -> ai_service_pb2.DetectionResponse:
        request_id = self._get_request_id(context)
        try:
            results = await self.yolo_service.detect_objects_async(request.image_data)

            objects = []
            for res in results:
                objects.append(
                    ai_service_pb2.DetectedObject(
                        label=res["label"],
                        confidence=res["confidence"],
                        bbox=res["bbox"],
                    )
                )

            logger.debug(
                "Detection completed", request_id=request_id, count=len(objects)
            )

            return ai_service_pb2.DetectionResponse(
                success=True, message="Detection successful", objects=objects
            )
        except Exception as e:
            logger.error(f"gRPC Detection failed: {e}", request_id=request_id)
            return ai_service_pb2.DetectionResponse(success=False, message=str(e))

    async def ExtractText(
        self, request: ai_service_pb2.OCRRequest, context: grpc.aio.ServicerContext
    ) -> ai_service_pb2.OCRResponse:
        request_id = self._get_request_id(context)
        try:
            lang = request.language if request.language else "en"

            result = await self.ocr_service.extract_text_async(request.image_data, lang)

            lines = []
            if "lines" in result:
                for line in result["lines"]:
                    bbox_flat = []
                    bbox_dict = line.get("bbox", {})
                    keys = ["top_left", "top_right", "bottom_right", "bottom_left"]
                    for k in keys:
                        point = bbox_dict.get(k, [0, 0])
                        bbox_flat.extend(point)

                    lines.append(
                        ai_service_pb2.OCRLine(
                            text=line["text"],
                            confidence=line["confidence"],
                            bbox=bbox_flat,
                        )
                    )

            logger.debug("OCR completed", request_id=request_id, lines=len(lines))

            return ai_service_pb2.OCRResponse(
                success=True,
                message="OCR successful",
                full_text=result.get("full_text", ""),
                lines=lines,
            )
        except Exception as e:
            logger.error(f"gRPC OCR failed: {e}", request_id=request_id)
            return ai_service_pb2.OCRResponse(success=False, message=str(e))

    async def TranscribeAudio(
        self, request: ai_service_pb2.AudioRequest, context: grpc.aio.ServicerContext
    ) -> ai_service_pb2.transcriptionResponse:
        request_id = self._get_request_id(context)
        try:
            filename = request.filename if request.filename else "audio.wav"

            result = await self.transcription_service.transcribe_audio_async(
                request.audio_data, filename
            )

            logger.debug(
                "Transcription completed",
                request_id=request_id,
                duration=result.get("duration", 0),
            )

            return ai_service_pb2.transcriptionResponse(
                success=True,
                text=result.get("text", ""),
                language=result.get("language", ""),
                duration=result.get("duration", 0.0),
            )
        except Exception as e:
            logger.error(f"gRPC Transcription failed: {e}", request_id=request_id)
            return ai_service_pb2.transcriptionResponse(success=False, text=str(e))

    async def VisualQuestionAnswering(
        self, request: ai_service_pb2.VQARequest, context: grpc.aio.ServicerContext
    ) -> ai_service_pb2.VQAResponse:
        request_id = self._get_request_id(context)
        try:
            answer = await self.vqa_service.answer_question_async(
                request.image_data, request.question
            )

            logger.debug(
                "VQA completed", request_id=request_id, answer_length=len(answer)
            )

            return ai_service_pb2.VQAResponse(
                success=True, message="Question answered", answer=answer
            )
        except Exception as e:
            logger.error(f"gRPC VQA failed: {e}", request_id=request_id)
            return ai_service_pb2.VQAResponse(success=False, message=str(e), answer="")


def cleanup_temp_files():
    """Clean up temporary files created during processing."""
    temp_dir = tempfile.gettempdir()
    patterns = ["*.wav", "*.mp3", "*.webm", "*.m4a"]

    cleaned = 0
    for pattern in patterns:
        for filepath in glob.glob(os.path.join(temp_dir, f"tmp*{pattern}")):
            try:
                os.remove(filepath)
                cleaned += 1
            except OSError:
                pass

    if cleaned > 0:
        logger.info(f"Cleaned up {cleaned} temporary files")


async def serve():
    """Start Async gRPC Server with graceful shutdown support."""
    global _server, model_status

    # Instantiate Services (Dependency Injection Root)
    logger.info("Initializing AI Services...")
    yolo_service = YoloService()
    ocr_service = OCRService()
    transcription_service = TranscriptionService()
    vqa_service = VQAService()

    # Warm up models with status tracking
    logger.info("Warming up models in gRPC process...")

    try:
        yolo_service.load()
        model_status["yolo"]["ready"] = True
        logger.info("YOLO Loaded.")
    except Exception as e:
        model_status["yolo"]["error"] = str(e)
        logger.error(f"YOLO load failed: {e}")

    try:
        ocr_service.load()
        model_status["ocr"]["ready"] = True
        logger.info("OCR Loaded.")
    except Exception as e:
        model_status["ocr"]["error"] = str(e)
        logger.error(f"OCR load failed: {e}")

    try:
        transcription_service.load()
        model_status["whisper"]["ready"] = True
        logger.info("Transcription Loaded.")
    except Exception as e:
        model_status["whisper"]["error"] = str(e)
        logger.error(f"Whisper load failed: {e}")

    try:
        vqa_service.load()
        model_status["vqa"]["ready"] = True
        logger.info("VQA Loaded.")
    except Exception as e:
        model_status["vqa"]["error"] = str(e)
        logger.error(f"VQA load failed: {e}")

    # Create gRPC server
    _server = grpc.aio.server()
    ai_service_pb2_grpc.add_AIServiceServicer_to_server(
        AIService(yolo_service, ocr_service, transcription_service, vqa_service),
        _server,
    )

    listen_addr = "[::]:50051"
    _server.add_insecure_port(listen_addr)

    logger.info(f"Starting gRPC server on {listen_addr}")

    await _server.start()

    # Wait for shutdown signal or termination
    import contextlib

    with contextlib.suppress(asyncio.CancelledError):
        await _shutdown_event.wait()


    logger.info("Graceful shutdown initiated...")

    # Graceful shutdown with timeout
    await _server.stop(grace=5.0)

    # Cleanup
    cleanup_temp_files()

    logger.info("gRPC server stopped")


def handle_shutdown_signal(signum, frame):
    """Handle shutdown signals (SIGTERM, SIGINT)."""
    signal_name = signal.Signals(signum).name
    logger.info(f"Received {signal_name}, initiating graceful shutdown...")
    _shutdown_event.set()


def run_server():
    """Synchronous entry point for multiprocessing with signal handling."""
    # Register signal handlers
    signal.signal(signal.SIGTERM, handle_shutdown_signal)
    signal.signal(signal.SIGINT, handle_shutdown_signal)

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    try:
        loop.run_until_complete(serve())
    except KeyboardInterrupt:
        logger.info("KeyboardInterrupt received")
        _shutdown_event.set()
        loop.run_until_complete(asyncio.sleep(0.1))
    finally:
        loop.close()
        logger.info("Event loop closed")
