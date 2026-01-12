# ==============================================================================
# TemanDifa AI Service - Multi-stage Dockerfile
# Optimized for smaller image size and faster builds
# ==============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Model Downloader & Exporter
# Installs heavy libs (torch, ultralytics) to export models, but doesn't pass them to runtime.
# -----------------------------------------------------------------------------
FROM python:3.10-slim-bookworm AS model-downloader

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    pkg-config \
    libavformat-dev libavcodec-dev libavdevice-dev libavutil-dev libswscale-dev libswresample-dev libavfilter-dev \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.build.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.build.txt

# Copy download script
COPY scripts/download_models.py /app/scripts/

# Create directory for models
RUN mkdir -p /app/models

# Set environment variables for download locations
ENV HOME="/app/models_cache" \
    XDG_CACHE_HOME="/app/models_cache/.cache" \
    WHISPER_CACHE="/app/models_cache/.cache/whisper"

# Run download and export
# This will generate yolov8n.onnx in /app (current dir of script run) or /app/scripts
# And whisper/paddleocr in /app/models_cache
RUN python scripts/download_models.py

# Organize artifacts for next stage
# Move ONNX model if present
RUN mv yolov8n.onnx /app/models/ || echo "No ONNX model found to move"


# -----------------------------------------------------------------------------
# Stage 2: Runtime Builder 
# Installs ONLY runtime dependencies (no torch, no ultralytics)
# -----------------------------------------------------------------------------
FROM python:3.10-slim-bookworm AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    git \
    pkg-config \
    libavformat-dev libavcodec-dev libavdevice-dev libavutil-dev libswscale-dev libswresample-dev libavfilter-dev \
    && rm -rf /var/lib/apt/lists/*

# Debug: Check if pkg-config is working
RUN pkg-config --version || echo "pkg-config missing!"

# Create virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy runtime requirements (clean list)
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt


# -----------------------------------------------------------------------------
# Stage 3: Runtime - Minimal production image
# -----------------------------------------------------------------------------
FROM python:3.10-slim-bookworm AS runtime

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:$PATH" \
    YOLO_CONFIG_DIR="/app/models" \
    HF_HOME="/app/models/huggingface" \
    XDG_CACHE_HOME="/home/appuser/.cache" \
    HOME="/home/appuser"

WORKDIR /app

# Install system dependencies required for OpenCV and Audio
# ffmpeg is needed for audio processing
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libgomp1 \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Create non-root user
RUN groupadd -r appuser && useradd -r -g appuser appuser

# Copy virtual environment from builder (Contains only runtime deps)
COPY --from=builder /opt/venv /opt/venv

# Copy pre-downloaded/exported models from downloader
COPY --from=model-downloader /app/models /app/models
# Copy Whisper and PaddleOCR caches
COPY --from=model-downloader /app/models_cache/.cache /home/appuser/.cache
COPY --from=model-downloader /app/models_cache/.paddleocr /home/appuser/.paddleocr

# Copy application code
COPY --chown=appuser:appuser app/ /app/app/

# Set permissions
RUN chown -R appuser:appuser /app /home/appuser

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

# Run with optimized settings
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
