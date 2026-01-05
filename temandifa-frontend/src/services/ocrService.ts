import axios from "axios";
import { OcrApiResponse } from "../types/ocr";

// Gunakan variable environment atau config global idealnya
const API_URL =
  process.env.EXPO_PUBLIC_API_URL || "http://10.0.2.2:8080/api/v1/ocr";

console.log("[OCRService] Initialized with API_URL:", API_URL);

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
    const response = await axios.post<OcrApiResponse>(API_URL, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  } catch (error) {
    console.error("OCR Service Error:", error);
    throw error;
  }
};
