from ultralytics import YOLO
from PIL import Image
import io

class YoloService:
    def __init__(self):
        # Load model nano for efficiency. Auto-downloads if not found.
        # Ensure 'models' directory exists.
        model_path = "yolov8n.pt" 
        self.model = YOLO(model_path) 

    def detect_objects(self, image_bytes: bytes):
        image = Image.open(io.BytesIO(image_bytes))
        results = self.model(image)
        
        detections = []
        for result in results:
            for box in result.boxes:
                # box.xyxy is the coordinates, box.conf is confidence, box.cls is class id
                coords = box.xyxy[0].tolist()
                confidence = float(box.conf[0])
                label = result.names[int(box.cls[0])]
                
                detections.append({
                    "label": label,
                    "confidence": confidence,
                    "bbox": coords
                })
        
        return detections

# Singleton instance
yolo_service = YoloService()
