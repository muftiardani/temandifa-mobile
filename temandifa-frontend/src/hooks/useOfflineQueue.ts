/**
 * useOfflineQueue Hook
 *
 * React hook for using the offline queue service with automatic status updates.
 */

import { useState, useEffect, useCallback } from "react";
import {
  offlineQueue,
  QueueStatus,
  QueuedRequest,
} from "../services/offlineQueue";

export interface UseOfflineQueueResult {
  status: QueueStatus;
  pendingRequests: QueuedRequest[];
  syncNow: () => Promise<{ success: number; failed: number }>;
  clearQueue: () => Promise<void>;
  removeRequest: (id: string) => Promise<boolean>;
}

export function useOfflineQueue(): UseOfflineQueueResult {
  const [status, setStatus] = useState<QueueStatus>(offlineQueue.getStatus());
  const [pendingRequests, setPendingRequests] = useState<QueuedRequest[]>(
    offlineQueue.getPendingRequests()
  );

  useEffect(() => {
    // Subscribe to status changes
    const unsubscribe = offlineQueue.subscribe((newStatus) => {
      setStatus(newStatus);
      setPendingRequests(offlineQueue.getPendingRequests());
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const syncNow = useCallback(async () => {
    return offlineQueue.syncQueue();
  }, []);

  const clearQueue = useCallback(async () => {
    await offlineQueue.clearQueue();
  }, []);

  const removeRequest = useCallback(async (id: string) => {
    return offlineQueue.removeFromQueue(id);
  }, []);

  return {
    status,
    pendingRequests,
    syncNow,
    clearQueue,
    removeRequest,
  };
}

export default useOfflineQueue;
