import axios from "axios";

// Gunakan variable environment atau config global idealnya
const API_URL =
  process.env.EXPO_PUBLIC_API_URL || "http://10.0.2.2:8080/api/v1";

console.log("[TranscriptionService] Initialized with API_URL:", API_URL);

export interface TranscriptionResult {
  status: string;
  text?: string;
  error?: string;
}

export const transcribeAudio = async (
  uri: string
): Promise<TranscriptionResult> => {
  console.log("[TranscriptionService] Sending audio for transcription...");
  const formData = new FormData();
  // @ts-ignore
  formData.append("file", {
    uri: uri,
    name: "recording.wav",
    type: "audio/wav",
  });

  try {
    const response = await axios.post<TranscriptionResult>(API_URL, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  } catch (error) {
    console.error("Transcription Service Error:", error);
    throw error;
  }
};
