/**
 * OfflineQueue Service
 *
 * Manages queuing of API requests when offline and syncs when back online.
 * Uses AsyncStorage for persistence across app restarts.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo, { NetInfoState } from "@react-native-community/netinfo";
import apiClient from "./apiClient";
import { Logger } from "./logger";

// Queue item interface
export interface QueuedRequest {
  id: string;
  endpoint: string;
  method: "POST" | "PUT" | "DELETE";
  data?: any;
  headers?: Record<string, string>;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

// Queue status
export interface QueueStatus {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  lastSyncTime: number | null;
}

const QUEUE_STORAGE_KEY = "@temandifa/offline_queue";
const MAX_QUEUE_SIZE = 100;
const DEFAULT_MAX_RETRIES = 3;

class OfflineQueueService {
  private queue: QueuedRequest[] = [];
  private isSyncing = false;
  private isOnline = true;
  private lastSyncTime: number | null = null;
  private listeners: Set<(status: QueueStatus) => void> = new Set();
  private unsubscribeNetInfo: (() => void) | null = null;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    // Load persisted queue
    await this.loadQueue();

    // Subscribe to network status changes
    this.unsubscribeNetInfo = NetInfo.addEventListener(
      this.handleConnectivityChange
    );

    // Check initial connectivity
    const state = await NetInfo.fetch();
    this.isOnline = state.isConnected ?? false;

    // If online, try to sync existing queue
    if (this.isOnline && this.queue.length > 0) {
      this.syncQueue();
    }

    Logger.info("OfflineQueue", "Initialized", {
      isOnline: this.isOnline,
      pendingCount: this.queue.length,
    });
  }

  private handleConnectivityChange = (state: NetInfoState) => {
    const wasOffline = !this.isOnline;
    this.isOnline = state.isConnected ?? false;

    Logger.info("OfflineQueue", "Connectivity changed:", {
      isOnline: this.isOnline,
      type: state.type,
    });

    if (wasOffline && this.isOnline && this.queue.length > 0) {
      Logger.info("OfflineQueue", "Back online, starting sync...");
      this.syncQueue();
    }

    this.notifyListeners();
  };

  /**
   * Add a request to the offline queue
   */
  async addToQueue(
    endpoint: string,
    method: "POST" | "PUT" | "DELETE",
    data?: any,
    headers?: Record<string, string>
  ): Promise<string> {
    // Generate unique ID
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const request: QueuedRequest = {
      id,
      endpoint,
      method,
      data,
      headers,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: DEFAULT_MAX_RETRIES,
    };

    // Check queue size limit
    if (this.queue.length >= MAX_QUEUE_SIZE) {
      // Remove oldest item
      this.queue.shift();
      Logger.warn("OfflineQueue", "Queue full, removed oldest item");
    }

    this.queue.push(request);
    await this.saveQueue();

    Logger.info("OfflineQueue", "Added request:", {
      id,
      endpoint,
      method,
      queueSize: this.queue.length,
    });

    this.notifyListeners();
    return id;
  }

  async syncQueue(): Promise<{ success: number; failed: number }> {
    if (!this.isOnline || this.isSyncing || this.queue.length === 0) {
      return { success: 0, failed: 0 };
    }

    this.isSyncing = true;
    this.notifyListeners();

    let successCount = 0;
    let failedCount = 0;
    const failedRequests: QueuedRequest[] = [];

    Logger.info("OfflineQueue", "Starting sync...", {
      count: this.queue.length,
    });

    for (const request of this.queue) {
      try {
        await this.executeRequest(request);
        successCount++;
        Logger.info("OfflineQueue", "Request synced:", request.id);
      } catch (error) {
        Logger.error("OfflineQueue", "Request failed:", {
          id: request.id,
          error,
        });

        // Increment retry count
        request.retryCount++;

        // Keep in queue if retries remaining
        if (request.retryCount < request.maxRetries) {
          failedRequests.push(request);
        } else {
          failedCount++;
          Logger.warn(
            "OfflineQueue",
            "Max retries reached, discarding:",
            request.id
          );
        }
      }
    }

    // Update queue with only failed requests
    this.queue = failedRequests;
    await this.saveQueue();

    this.isSyncing = false;
    this.lastSyncTime = Date.now();
    this.notifyListeners();

    Logger.info("OfflineQueue", "Sync complete:", {
      successCount,
      failedCount,
      remaining: this.queue.length,
    });

    return { success: successCount, failed: failedCount };
  }

  /**
   * Execute a single queued request
   */
  private async executeRequest(request: QueuedRequest): Promise<void> {
    const config: any = {
      method: request.method,
      url: request.endpoint,
      data: request.data,
      headers: request.headers,
    };

    await apiClient.request(config);
  }

  /**
   * Load queue from AsyncStorage
   */
  private async loadQueue(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
        Logger.info("OfflineQueue", "Loaded queue:", {
          count: this.queue.length,
        });
      }
    } catch (error) {
      Logger.error("OfflineQueue", "Failed to load queue:", error);
      this.queue = [];
    }
  }

  /**
   * Save queue to AsyncStorage
   */
  private async saveQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      Logger.error("OfflineQueue", "Failed to save queue:", error);
    }
  }

  /**
   * Get current queue status
   */
  getStatus(): QueueStatus {
    return {
      isOnline: this.isOnline,
      pendingCount: this.queue.length,
      isSyncing: this.isSyncing,
      lastSyncTime: this.lastSyncTime,
    };
  }

  /**
   * Get pending requests (for debugging/display)
   */
  getPendingRequests(): QueuedRequest[] {
    return [...this.queue];
  }

  /**
   * Clear all pending requests
   */
  async clearQueue(): Promise<void> {
    this.queue = [];
    await this.saveQueue();
    this.notifyListeners();
    Logger.info("OfflineQueue", "Queue cleared");
  }

  /**
   * Remove a specific request from queue
   */
  async removeFromQueue(id: string): Promise<boolean> {
    const index = this.queue.findIndex((r) => r.id === id);
    if (index > -1) {
      this.queue.splice(index, 1);
      await this.saveQueue();
      this.notifyListeners();
      return true;
    }
    return false;
  }

  /**
   * Subscribe to queue status changes
   */
  subscribe(listener: (status: QueueStatus) => void): () => void {
    this.listeners.add(listener);
    // Immediately notify with current status
    listener(this.getStatus());

    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of status change
   */
  private notifyListeners() {
    const status = this.getStatus();
    this.listeners.forEach((listener) => listener(status));
  }

  /**
   * Cleanup when app is closing
   */
  cleanup() {
    if (this.unsubscribeNetInfo) {
      this.unsubscribeNetInfo();
    }
    this.listeners.clear();
  }
}

// Singleton instance
export const offlineQueue = new OfflineQueueService();

// Helper function to add history to queue when offline
export async function queueHistorySave(
  featureType: "OBJECT" | "OCR" | "VOICE",
  inputSource: string,
  resultText: string
): Promise<string> {
  return offlineQueue.addToQueue("/history", "POST", {
    feature_type: featureType,
    input_source: inputSource,
    result_text: resultText,
  });
}
