import axios from "axios";
import { ApiResponse } from "../types/detection";

// Ganti dengan IP komputer Anda jika test di HP Fisik
// Jika di Android Emulator gunakan 10.0.2.2
const API_URL =
  process.env.EXPO_PUBLIC_API_URL || "http://10.0.2.2:8080/api/v1/detect";

console.log("[DetectionService] Initialized with API_URL:", API_URL);

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
    const response = await axios.post<ApiResponse>(API_URL, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  } catch (error) {
    console.error("Detection Service Error:", error);
    throw error;
  }
};
