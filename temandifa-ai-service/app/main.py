from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import detection

app = FastAPI(title="TemanDifa AI Service", version="1.0.0")

# Allow local connections
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(detection.router)

@app.get("/")
def read_root():
    return {"status": "online", "service": "TemanDifa AI Worker"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}
