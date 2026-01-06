from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import detection, ocr, transcription

app = FastAPI(title="TemanDifa AI Service", version="1.0.0")

# Allow local connections
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all AI routers
app.include_router(detection.router)
app.include_router(ocr.router)
app.include_router(transcription.router)

@app.get("/")
def read_root():
    return {"status": "online", "service": "TemanDifa AI Worker"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}
