from paddleocr import PaddleOCR
import numpy as np
from PIL import Image
import io

class OCRService:
    def __init__(self):
        # Initialize PaddleOCR with English and Indonesian support
        # use_angle_cls=True enables text orientation detection
        self.ocr = PaddleOCR(use_angle_cls=True, lang='en')

    def extract_text(self, image_bytes: bytes):
        image = Image.open(io.BytesIO(image_bytes))
        # Convert to numpy array for PaddleOCR
        img_array = np.array(image)
        
        result = self.ocr.ocr(img_array, cls=True)
        
        extracted_texts = []
        if result and result[0]:
            for line in result[0]:
                # line structure: [[box_coords], [text, confidence]]
                text = line[1][0]
                confidence = line[1][1]
                extracted_texts.append({
                    "text": text,
                    "confidence": confidence
                })
        
        full_text = " ".join([item['text'] for item in extracted_texts])
        
        return {
            "full_text": full_text,
            "lines": extracted_texts
        }

# Singleton instance
ocr_service = OCRService()
