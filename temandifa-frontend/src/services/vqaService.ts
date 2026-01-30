import apiClient from "./apiClient";
import { Logger } from "./logger";

export interface VQAResponse {
  success: boolean;
  message: string;
  answer: string;
}

/**
 * Ask a question about an image (Visual Question Answering)
 * @param imageUri - Local URI of the image
 * @param question - Question to ask about the image
 * @returns VQAResponse with the answer
 */
export const askAboutImage = async (
  imageUri: string,
  question: string
): Promise<{ data: VQAResponse | null; error: string | null }> => {
  try {
    const formData = new FormData();

    const filename = imageUri.split("/").pop() || "image.jpg";
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : "image/jpeg";

    // @ts-ignore - ReactNative FormData expects this structure for files
    formData.append("file", { uri: imageUri, name: filename, type });
    formData.append("question", question);

    const response = await apiClient.post<VQAResponse>("/ai/ask", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return { data: response.data, error: null };
  } catch (error: any) {
    Logger.error("VQAService", "Failed to ask about image", error);
    return {
      data: null,
      error: error.message || "Failed to process VQA request",
    };
  }
};
