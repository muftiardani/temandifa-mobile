import apiClient, { getErrorMessage } from "./apiClient";

console.log("[TranscriptionService] Initialized");

export interface TranscriptionResult {
  status: string;
  text?: string;
  language?: string;
  error?: string;
}

interface TranscriptionApiResponse {
  status: string;
  filename: string;
  data: {
    text: string;
    language: string;
  };
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
    const response = await apiClient.post<TranscriptionApiResponse>(
      "/transcribe",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        timeout: 60000, // 60 seconds for audio transcription
      }
    );

    // Map API response to TranscriptionResult
    return {
      status: response.data.status,
      text: response.data.data?.text,
      language: response.data.data?.language,
    };
  } catch (error) {
    console.error("[TranscriptionService] Error:", getErrorMessage(error));
    throw error;
  }
};
