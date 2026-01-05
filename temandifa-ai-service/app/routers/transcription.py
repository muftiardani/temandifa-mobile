from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.transcription_service import transcription_service
import traceback

router = APIRouter()

@router.post("/transcribe", tags=["AI"])
async def transcribe_audio(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        result = transcription_service.transcribe_audio(contents, file.filename)
        
        return {
            "status": "success",
            "filename": file.filename,
            "data": result
        }
    except Exception as e:
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))
