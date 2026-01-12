import apiClient, { getErrorMessage } from "./apiClient";
import {
  DetectionResponse,
  DetectionResponseSchema,
} from "../schemas/detection";

import { Logger } from "./logger";

Logger.info("DetectionService", "Initialized");

export const detectObject = async (
  imageUri: string
): Promise<DetectionResponse> => {
  Logger.info("DetectionService", "Sending image to API...");
  const formData = new FormData();
  // @ts-ignore
  formData.append("file", {
    uri: imageUri,
    name: "photo.jpg",
    type: "image/jpeg",
  });

  try {
    const response = await apiClient.post("/detect", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      timeout: 15000,
    });

    // Validate with Zod
    const parsed = DetectionResponseSchema.parse(response.data);
    return parsed;
  } catch (error) {
    Logger.error("DetectionService", "Error:", getErrorMessage(error));
    throw error;
  }
};
