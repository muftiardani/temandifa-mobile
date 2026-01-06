import apiClient, { getErrorMessage } from "./apiClient";
import { ApiResponse } from "../types/detection";

console.log("[DetectionService] Initialized");

export const detectObject = async (imageUri: string): Promise<ApiResponse> => {
  console.log("[DetectionService] Sending image to API...");
  const formData = new FormData();
  // @ts-ignore - React Native FormData expects an object with uri, name, type
  formData.append("file", {
    uri: imageUri,
    name: "photo.jpg",
    type: "image/jpeg",
  });

  try {
    const response = await apiClient.post<ApiResponse>("/detect", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      timeout: 15000, // 15 seconds for detection
    });
    return response.data;
  } catch (error) {
    console.error("[DetectionService] Error:", getErrorMessage(error));
    throw error;
  }
};
