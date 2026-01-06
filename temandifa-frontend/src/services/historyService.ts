import apiClient, { getErrorMessage } from "./apiClient";

console.log("[HistoryService] Initialized");

export type FeatureType = "OBJECT" | "OCR" | "VOICE";

export interface HistoryItem {
  ID: number;
  CreatedAt: string;
  UpdatedAt: string;
  user_id: number;
  feature_type: FeatureType;
  input_source: string;
  result_text: string;
}

interface HistoryListResponse {
  data: HistoryItem[];
  count: number;
}

interface HistoryCreateResponse {
  message: string;
  data: HistoryItem;
}

// Get user's history
export const getUserHistory = async (): Promise<HistoryItem[]> => {
  try {
    console.log("[HistoryService] Fetching user history...");
    const response = await apiClient.get<HistoryListResponse>("/history");
    return response.data.data;
  } catch (error) {
    console.error("[HistoryService] Fetch error:", getErrorMessage(error));
    throw error;
  }
};

// Save a history entry
export const saveHistory = async (
  featureType: FeatureType,
  inputSource: string,
  resultText: string
): Promise<HistoryItem> => {
  try {
    console.log("[HistoryService] Saving history:", featureType);
    const response = await apiClient.post<HistoryCreateResponse>("/history", {
      feature_type: featureType,
      input_source: inputSource,
      result_text: resultText,
    });
    return response.data.data;
  } catch (error) {
    console.error("[HistoryService] Save error:", getErrorMessage(error));
    throw error;
  }
};

// Delete a specific history entry
export const deleteHistory = async (id: number): Promise<void> => {
  try {
    console.log("[HistoryService] Deleting history:", id);
    await apiClient.delete(`/history/${id}`);
  } catch (error) {
    console.error("[HistoryService] Delete error:", getErrorMessage(error));
    throw error;
  }
};

// Clear all user history
export const clearAllHistory = async (): Promise<number> => {
  try {
    console.log("[HistoryService] Clearing all history...");
    const response = await apiClient.delete<{
      message: string;
      deleted: number;
    }>("/history");
    return response.data.deleted;
  } catch (error) {
    console.error("[HistoryService] Clear error:", getErrorMessage(error));
    throw error;
  }
};
