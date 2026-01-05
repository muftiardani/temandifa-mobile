from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.ocr_service import ocr_service
import traceback

router = APIRouter()

@router.post("/ocr", tags=["AI"])
async def extract_text(file: UploadFile = File(...)):
    try:
        if not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="File must be an image")
            
        contents = await file.read()
        result = ocr_service.extract_text(contents)
        
        return {
            "status": "success",
            "filename": file.filename,
            "data": result
        }
    except Exception as e:
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))
