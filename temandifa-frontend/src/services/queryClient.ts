import { QueryClient } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Persister } from "@tanstack/react-query-persist-client";
import { Logger } from "./logger";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
    },
  },
});

const QUERY_CLIENT_STORAGE_KEY = "REACT_QUERY_OFFLINE_CACHE";

export const asyncStoragePersister: Persister = {
  persistClient: async (client: unknown) => {
    try {
      await AsyncStorage.setItem(
        QUERY_CLIENT_STORAGE_KEY,
        JSON.stringify(client)
      );
    } catch (error) {
      Logger.error("QueryClient", "Failed to persist client", error);
    }
  },
  restoreClient: async () => {
    try {
      const client = await AsyncStorage.getItem(QUERY_CLIENT_STORAGE_KEY);
      return client ? JSON.parse(client) : undefined;
    } catch (error) {
      Logger.error("QueryClient", "Failed to restore client", error);
      return undefined;
    }
  },
  removeClient: async () => {
    try {
      await AsyncStorage.removeItem(QUERY_CLIENT_STORAGE_KEY);
    } catch (error) {
      Logger.error("QueryClient", "Failed to remove client", error);
    }
  },
};
