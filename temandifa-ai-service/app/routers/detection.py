from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.yolo_service import yolo_service
import traceback

router = APIRouter()

@router.post("/detect", tags=["AI"])
async def detect_objects(file: UploadFile = File(...)):
    try:
        if not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="File must be an image")
            
        contents = await file.read()
        detections = yolo_service.detect_objects(contents)
        
        return {
            "status": "success",
            "filename": file.filename,
            "data": detections
        }
    except Exception as e:
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))
