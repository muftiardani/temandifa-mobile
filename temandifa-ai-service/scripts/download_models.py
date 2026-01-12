import os

from faster_whisper import download_model as download_whisper_model
from paddleocr import PaddleOCR
from ultralytics import YOLO


def download_models():
    print("--- Starting Model Downloads & Optimization ---")

    # YOLOv8 (Download PT -> Export to ONNX)
    print("Downloading & Exporting YOLOv8 (yolov8n)...")
    try:
        model = YOLO("yolov8n.pt")
        # Export to ONNX
        success = model.export(
            format="onnx", dynamic=True
        )  # Dynamic shapes for flexibility
        if success:
            print(f"YOLOv8 export successful: {success}")
            # Ensure it is in expected path /app/models/yolov8n.onnx
            # Ultralytics exports to same dir as .pt
            if os.path.exists("yolov8n.onnx"):
                # We will leave it here, Dockerfile handles moving it
                pass
        else:
            print("YOLOv8 export failed.")

    except Exception as e:
        print(f"Failed to process YOLO model: {e}")

    # PaddleOCR
    print("Downloading PaddleOCR (lang=en)...")
    try:
        # triggering the download
        PaddleOCR(use_angle_cls=True, lang="en", show_log=False)
        print("PaddleOCR downloaded.")
    except Exception as e:
        print(f"Failed to download PaddleOCR: {e}")

    # Faster Whisper
    print("Downloading Faster Whisper (base) INT8...")
    try:
        # Download to specific cache dir.
        # faster-whisper saves to cache dir automatically.
        # We assume XDG_CACHE_HOME is set in Dockerfile.
        # But download_model also allows output_dir.
        # Let's check where it puts it. It puts it in ~/.cache/huggingface/hub...
        # or we can assume it follows environment variables.

        # We just run a dummy load or explicit download to populate cache.
        model_path = download_whisper_model(
            "base", output_dir=os.environ.get("WHISPER_CACHE", None)
        )
        print(f"Faster Whisper downloaded to: {model_path}")
    except Exception as e:
        print(f"Failed to download Faster Whisper: {e}")

    print("--- Finished Model Downloads ---")


if __name__ == "__main__":
    download_models()
