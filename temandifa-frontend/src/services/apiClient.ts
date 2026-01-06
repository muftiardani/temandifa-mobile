import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import * as SecureStore from "expo-secure-store";

// Base API URL from environment or fallback for Android Emulator
const API_URL =
  process.env.EXPO_PUBLIC_API_URL || "http://10.0.2.2:8080/api/v1";

console.log("[ApiClient] Initialized with API_URL:", API_URL);

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 30000, // 30 seconds default timeout
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor - add auth token
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      const token = await SecureStore.getItemAsync("token");
      if (token && token !== "GUEST_TOKEN") {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      console.log("[ApiClient] Failed to get token from storage");
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle errors and retry
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as InternalAxiosRequestConfig & {
      _retry?: number;
    };

    if (!config) {
      return Promise.reject(error);
    }

    // Initialize retry counter
    if (config._retry === undefined) {
      config._retry = 0;
    }

    // Conditions for retry
    const shouldRetry =
      config._retry < 3 &&
      (error.code === "ECONNABORTED" || // Timeout
        error.code === "ERR_NETWORK" || // Network error
        error.response?.status === 502 || // Bad Gateway
        error.response?.status === 503 || // Service Unavailable
        error.response?.status === 504); // Gateway Timeout

    if (shouldRetry) {
      config._retry++;
      console.log(
        `[ApiClient] Retrying request (${config._retry}/3):`,
        config.url
      );

      // Exponential backoff: 1s, 2s, 4s
      const delay = Math.pow(2, config._retry - 1) * 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));

      return apiClient(config);
    }

    // Handle 401 Unauthorized - token expired
    if (error.response?.status === 401) {
      console.log("[ApiClient] Unauthorized - token may be expired");
      // Could trigger logout or token refresh here
    }

    return Promise.reject(error);
  }
);

// Helper function to get error message
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    // Server responded with error
    if (error.response?.data?.error) {
      return error.response.data.error;
    }
    // Network or timeout error
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
