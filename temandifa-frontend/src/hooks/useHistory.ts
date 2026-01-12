import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getUserHistory,
  deleteHistory,
  HistoryItem,
} from "../services/historyService";
import Toast from "react-native-toast-message";

export const HISTORY_QUERY_KEY = ["history"];

interface HistoryQueryResult {
  items: HistoryItem[];
  total: number;
  totalPages: number;
}

export function useHistoryQuery() {
  return useQuery<HistoryQueryResult>({
    queryKey: HISTORY_QUERY_KEY,
    queryFn: () => getUserHistory(),
    staleTime: 1000 * 60, // 1 minute
  });
}

export function useDeleteHistoryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteHistory,
    onMutate: async (id) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: HISTORY_QUERY_KEY });

      // Snapshot the previous value
      const previousHistory =
        queryClient.getQueryData<HistoryQueryResult>(HISTORY_QUERY_KEY);

      // Optimistically update to the new value
      if (previousHistory) {
        queryClient.setQueryData<HistoryQueryResult>(HISTORY_QUERY_KEY, {
          ...previousHistory,
          items: previousHistory.items.filter((item) => item.ID !== id),
          total: previousHistory.total - 1,
        });
      }

      // Return a context object with the snapshotted value
      return { previousHistory };
    },
    onSuccess: (data, id) => {
      // Logic for queued items (offline)
      if (data && "queued" in data) {
        Toast.show({
          type: "info",
          text1: "Offline",
          text2: "Penghapusan antri. Akan diproses saat online.",
        });
        return;
      }

      Toast.show({
        type: "success",
        text1: "Berhasil",
        text2: "Riwayat telah dihapus",
      });
    },
    onError: (err, id, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousHistory) {
        queryClient.setQueryData(HISTORY_QUERY_KEY, context.previousHistory);
      }

      Toast.show({
        type: "error",
        text1: "Gagal",
        text2: "Gagal menghapus riwayat",
      });
    },
    onSettled: () => {
      // Always refetch after error or success:
      queryClient.invalidateQueries({ queryKey: HISTORY_QUERY_KEY });
    },
  });
}
