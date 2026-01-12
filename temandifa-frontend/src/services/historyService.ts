import apiClient, { getErrorMessage } from "./apiClient";
import { offlineQueue } from "./offlineQueue";
import NetInfo from "@react-native-community/netinfo";
import {
  HistoryItem,
  FeatureType,
  HistoryListResponseSchema,
  HistoryCreateResponseSchema,
} from "../schemas/history";
import { Logger } from "./logger";

Logger.info("HistoryService", "Initialized");

export type { HistoryItem, FeatureType };

/**
 * Fetch user history with pagination
 */
export const getUserHistory = async (
  page: number = 1,
  limit: number = 20
): Promise<{ items: HistoryItem[]; total: number; totalPages: number }> => {
  try {
    Logger.info("HistoryService", "Fetching user history...", { page, limit });
    const response = await apiClient.get(
      `/history?page=${page}&limit=${limit}`
    );

    // Validate response with Zod
    const parsedData = HistoryListResponseSchema.parse(response.data);

    return {
      items: parsedData.data,
      total: parsedData.meta.total,
      totalPages: parsedData.meta.total_pages,
    };
  } catch (error) {
    Logger.error("HistoryService", "Fetch error:", getErrorMessage(error));
    throw error;
  }
};

/**
 * Save history - automatically queues if offline
 */
export const saveHistory = async (
  featureType: FeatureType,
  inputSource: string,
  resultText: string
): Promise<HistoryItem | { queued: true; id: string }> => {
  const data = {
    feature_type: featureType,
    input_source: inputSource,
    result_text: resultText,
  };

  // Check network status
  const netState = await NetInfo.fetch();
  const isOnline = netState.isConnected;

  if (!isOnline) {
    // Queue for later sync
    Logger.info("HistoryService", "Offline - queuing history save");
    const queueId = await offlineQueue.addToQueue("/history", "POST", data);
    return { queued: true, id: queueId };
  }

  try {
    Logger.info("HistoryService", "Saving history:", featureType);
    const response = await apiClient.post("/history", data);

    // Validate response with Zod
    const parsedResponse = HistoryCreateResponseSchema.parse(response.data);
    return parsedResponse.data;
  } catch (error) {
    // If request fails due to network, queue it
    const errorMessage = getErrorMessage(error);
    if (
      errorMessage.includes("Network") ||
      errorMessage.includes("timeout") ||
      errorMessage.includes("connection")
    ) {
      Logger.info("HistoryService", "Network error - queuing history save");
      const queueId = await offlineQueue.addToQueue("/history", "POST", data);
      return { queued: true, id: queueId };
    }
    Logger.error("HistoryService", "Save error:", errorMessage);
    throw error;
  }
};

/**
 * Delete a history item - queues if offline
 */
export const deleteHistory = async (
  id: number
): Promise<void | { queued: true }> => {
  const netState = await NetInfo.fetch();

  if (!netState.isConnected) {
    Logger.info("HistoryService", "Offline - queuing history delete");
    await offlineQueue.addToQueue(`/history/${id}`, "DELETE");
    return { queued: true };
  }

  try {
    Logger.info("HistoryService", "Deleting history:", id);
    await apiClient.delete(`/history/${id}`);
  } catch (error) {
    Logger.error("HistoryService", "Delete error:", getErrorMessage(error));
    throw error;
  }
};

/**
 * Clear all history
 */
export const clearAllHistory = async (): Promise<number> => {
  try {
    Logger.info("HistoryService", "Clearing all history...");
    const response = await apiClient.delete<{
      message: string;
      deleted: number;
    }>("/history");
    return response.data.deleted;
  } catch (error) {
    Logger.error("HistoryService", "Clear error:", getErrorMessage(error));
    throw error;
  }
};

export function isQueuedResult(
  result: HistoryItem | { queued: true; id: string }
): result is { queued: true; id: string } {
  return "queued" in result && result.queued === true;
}
