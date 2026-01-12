import axios, {
  AxiosError,
  InternalAxiosRequestConfig,
  isAxiosError,
} from "axios";
import * as SecureStore from "expo-secure-store";

import { Logger } from "./logger";

const API_URL =
  process.env.EXPO_PUBLIC_API_URL || "http://10.0.2.2:8080/api/v1";

Logger.info("ApiClient", "Initialized with API_URL:", { API_URL });

const STORAGE_KEYS = {
  ACCESS_TOKEN: "access_token",
  REFRESH_TOKEN: "refresh_token",
};

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onTokenRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      const token = await SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
      if (token && token !== "GUEST_TOKEN") {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      Logger.warn("ApiClient", "Failed to get token from storage");
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
      _retryCount?: number;
    };

    if (!originalRequest) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      // Don't retry for login/register/refresh endpoints
      const noRefreshUrls = ["/login", "/register", "/refresh", "/logout"];
      if (noRefreshUrls.some((url) => originalRequest.url?.includes(url))) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      // If already refreshing, queue this request
      if (isRefreshing) {
        return new Promise((resolve) => {
          subscribeTokenRefresh((token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(apiClient(originalRequest));
          });
        });
      }

      isRefreshing = true;

      try {
        const refreshToken = await SecureStore.getItemAsync(
          STORAGE_KEYS.REFRESH_TOKEN
        );
        if (!refreshToken) {
          throw new Error("No refresh token available");
        }

        Logger.info("ApiClient", "Attempting token refresh...");

        const response = await axios.post(`${API_URL}/refresh`, {
          refresh_token: refreshToken,
        });

        const { access_token, refresh_token } = response.data.data;

        await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, access_token);
        await SecureStore.setItemAsync(
          STORAGE_KEYS.REFRESH_TOKEN,
          refresh_token
        );

        Logger.info("ApiClient", "Token refreshed successfully");

        apiClient.defaults.headers.common["Authorization"] =
          `Bearer ${access_token}`;

        onTokenRefreshed(access_token);

        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        Logger.error("ApiClient", "Token refresh failed:", refreshError);
        await SecureStore.deleteItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
        await SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    if (originalRequest._retryCount === undefined) {
      originalRequest._retryCount = 0;
    }

    const shouldRetry =
      originalRequest._retryCount < 3 &&
      (error.code === "ECONNABORTED" ||
        error.code === "ERR_NETWORK" ||
        error.response?.status === 502 ||
        error.response?.status === 503 ||
        error.response?.status === 504);

    if (shouldRetry) {
      originalRequest._retryCount++;
      Logger.warn(
        "ApiClient",
        `Retrying request (${originalRequest._retryCount}/3):`,
        { url: originalRequest.url }
      );

      const delay = Math.pow(2, originalRequest._retryCount - 1) * 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));

      return apiClient(originalRequest);
    }

    return Promise.reject(error);
  }
);

export function getErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    if (error.response?.data?.error?.message) {
      return error.response.data.error.message;
    }
    if (error.response?.data?.error) {
      return typeof error.response.data.error === "string"
        ? error.response.data.error
        : "Terjadi kesalahan";
    }
    if (error.code === "ECONNABORTED") {
      return "Koneksi timeout. Silakan coba lagi.";
    }
    if (error.code === "ERR_NETWORK") {
      return "Tidak ada koneksi internet.";
    }
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Terjadi kesalahan yang tidak diketahui";
}

export default apiClient;
