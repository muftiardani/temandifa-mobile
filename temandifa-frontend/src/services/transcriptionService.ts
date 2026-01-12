import apiClient, { getErrorMessage } from "./apiClient";
import {
  TranscriptionResult,
  TranscriptionResponseSchema,
} from "../schemas/transcription";

import { Logger } from "./logger";

Logger.info("TranscriptionService", "Initialized");

export { TranscriptionResult };

export const transcribeAudio = async (
  uri: string
): Promise<TranscriptionResult> => {
  Logger.info("TranscriptionService", "Sending audio for transcription...");
  const formData = new FormData();
  // @ts-ignore
  formData.append("file", {
    uri: uri,
    name: "recording.wav",
    type: "audio/wav",
  });

  try {
    const response = await apiClient.post("/transcribe", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      timeout: 60000,
    });

    // Validate with Zod
    const parsed = TranscriptionResponseSchema.parse(response.data);

    return {
      status: parsed.status,
      text: parsed.data?.text,
      language: parsed.data?.language,
      error: parsed.error,
    };
  } catch (error) {
    Logger.error("TranscriptionService", "Error:", getErrorMessage(error));
    throw error;
  }
};
