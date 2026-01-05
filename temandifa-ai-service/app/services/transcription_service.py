import whisper
import os
import tempfile

class TranscriptionService:
    def __init__(self):
        # Load small model for reasonable speed on CPU
        # Options: tiny, base, small, medium, large
        self.model = whisper.load_model("base")

    def transcribe_audio(self, audio_bytes: bytes, filename: str):
        # Whisper needs a file path, it doesn't support in-memory bytes consistently across versions
        suffix = os.path.splitext(filename)[1]
        if not suffix:
            suffix = ".wav" # Default to wav if unknown
            
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as temp:
            temp.write(audio_bytes)
            temp_path = temp.name
            
        try:
            result = self.model.transcribe(temp_path)
            return {
                "text": result["text"],
                "language": result["language"]
            }
        finally:
            # Cleanup temp file
            if os.path.exists(temp_path):
                os.remove(temp_path)

# Singleton
transcription_service = TranscriptionService()
