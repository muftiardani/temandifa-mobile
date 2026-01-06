import apiClient, { getErrorMessage } from "./apiClient";
import { OcrApiResponse } from "../types/ocr";

console.log("[OCRService] Initialized");

export const scanText = async (imageUri: string): Promise<OcrApiResponse> => {
  console.log("[OCRService] Sending image for OCR...");
  const formData = new FormData();
  // @ts-ignore
  formData.append("file", {
    uri: imageUri,
    name: "doc.jpg",
    type: "image/jpeg",
  });

  try {
    const response = await apiClient.post<OcrApiResponse>("/ocr", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      timeout: 25000, // 25 seconds for OCR (text extraction takes longer)
    });
    return response.data;
  } catch (error) {
    console.error("[OCRService] Error:", getErrorMessage(error));
    throw error;
  }
};
