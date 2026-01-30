import { act, waitFor } from "@testing-library/react-native";
import { useAuthStore } from "../authStore";
import * as SecureStore from "expo-secure-store";
import * as AuthService from "../../services/authService";
import * as Sentry from "@sentry/react-native";

// --- COMPLEX MOCKS SETUP ---

// 1. Mock SecureStore (Hoisted)
jest.mock("expo-secure-store", () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// 2. Mock AuthService
jest.mock("../../services/authService", () => ({
  login: jest.fn(),
  logout: jest.fn(),
  register: jest.fn(),
}));

// 3. Mock Sentry
jest.mock("@sentry/react-native", () => ({
  setUser: jest.fn(),
}));

// 4. Mock Logger
jest.mock("../../services/logger", () => ({
  Logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

describe.skip("authStore (Complex Mock)", () => {
  // Local in-memory storage for this test suite
  const mockStorage = new Map<string, string>();

  const mockUser = {
    id: 1,
    email: "test@example.com",
    full_name: "Test User",
  };

  const mockLoginResult = {
    user: mockUser,
    tokens: {
      accessToken: "access-token-123",
      refreshToken: "refresh-token-456",
      expiresAt: "2099-12-31",
    },
  };

  beforeEach(() => {
    jest.useFakeTimers(); // Control time for async state
    jest.clearAllMocks();
    mockStorage.clear();

    // -- DYNAMIC MOCK IMPLEMENTATION --
    // This allows the mock to access 'mockStorage' which is in the test scope
    (SecureStore.setItemAsync as jest.Mock).mockImplementation(
      async (key, value) => {
        mockStorage.set(key, value);
        return Promise.resolve();
      }
    );

    (SecureStore.getItemAsync as jest.Mock).mockImplementation(async (key) => {
      return Promise.resolve(mockStorage.get(key) || null);
    });

    (SecureStore.deleteItemAsync as jest.Mock).mockImplementation(
      async (key) => {
        mockStorage.delete(key);
        return Promise.resolve();
      }
    );

    // Reset Zustand Store
    act(() => {
      useAuthStore.setState({
        user: null,
        token: null,
        refreshToken: null,
        isAuthenticated: false,
        loading: false,
        isBiometricEnabled: false,
      });
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("Login Flow", () => {
    it("should store tokens and update state on successful login", async () => {
      (AuthService.login as jest.Mock).mockResolvedValue(mockLoginResult);

      await act(async () => {
        await useAuthStore.getState().login("test@example.com", "password");
      });

      // Fast-forward timers to handle any timeouts in the store
      jest.runAllTimers();

      await waitFor(() => {
        const state = useAuthStore.getState();
        expect(state.user).toEqual(mockUser);
        expect(state.token).toBe("access-token-123");
        expect(state.isAuthenticated).toBe(true);
      });

      // Verify Persistence
      await waitFor(() => {
        expect(mockStorage.get("access_token")).toBe("access-token-123");
      });

      // Verify Sentry (Commented out if strict checking fails in some envs)
      expect(Sentry.setUser).toHaveBeenCalledWith({
        id: "1",
        email: "test@example.com",
        username: "Test User",
      });
    });

    it("should handle login failure", async () => {
      const error = new Error("Invalid credentials");
      (AuthService.login as jest.Mock).mockRejectedValue(error);

      await expect(
        useAuthStore.getState().login("test@example.com", "wrong-password")
      ).rejects.toThrow("Invalid credentials");

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.token).toBeNull();
    });
  });

  describe("Initialization Flow", () => {
    it("should restore session from storage", async () => {
      mockStorage.set("access_token", "stored-token");
      mockStorage.set("refresh_token", "stored-refresh");
      mockStorage.set("user", JSON.stringify(mockUser));

      await act(async () => {
        await useAuthStore.getState().initialize();
      });

      jest.runAllTimers();

      await waitFor(() => {
        const state = useAuthStore.getState();
        expect(state.token).toBe("stored-token");
        expect(state.isAuthenticated).toBe(true);
      });
    });
  });
});
