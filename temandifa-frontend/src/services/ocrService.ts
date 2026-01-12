import apiClient, { getErrorMessage } from "./apiClient";
import { OcrResponseSchema, OcrResponse } from "../schemas/ocr";
import { Logger } from "./logger";

Logger.info("OCRService", "Initialized");

export const scanText = async (imageUri: string): Promise<OcrResponse> => {
  Logger.info("OCRService", "Sending image for OCR...");
  const formData = new FormData();
  // @ts-ignore
  formData.append("file", {
    uri: imageUri,
    name: "doc.jpg",
    type: "image/jpeg",
  });

  try {
    const response = await apiClient.post("/ocr", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      timeout: 25000, // 25 seconds for OCR (text extraction takes longer)
    });

    // Validate with Zod
    Logger.info("OCRService", "Validating OCR response...");
    const parsed = OcrResponseSchema.parse(response.data);

    return parsed;
  } catch (error) {
    Logger.error("OCRService", "Error:", getErrorMessage(error));
    throw error;
  }
};
