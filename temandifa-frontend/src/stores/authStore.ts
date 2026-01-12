import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import * as Sentry from "@sentry/react-native";
import { User } from "../schemas/auth";
import {
  login as apiLogin,
  logout as apiLogout,
  register as apiRegister,
  LoginResult,
} from "../services/authService";
import { Logger } from "../services/logger";

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  isBiometricEnabled: boolean;

  login: (email: string, password: string) => Promise<void>;
  loginAsGuest: () => Promise<void>;
  logout: () => Promise<void>;
  register: (
    fullName: string,
    email: string,
    password: string
  ) => Promise<void>;
  setAuth: (data: LoginResult) => Promise<void>;
  initialize: () => Promise<void>;

  enableBiometrics: (password: string) => Promise<void>;
  disableBiometrics: () => Promise<void>;
  loginWithBiometrics: () => Promise<void>;
}

const STORAGE_KEYS = {
  ACCESS_TOKEN: "access_token",
  REFRESH_TOKEN: "refresh_token",
  EXPIRES_AT: "token_expires_at",
  USER: "user",
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  refreshToken: null,
  loading: true,
  isAuthenticated: false,
  isBiometricEnabled: false,

  setAuth: async (data: LoginResult) => {
    const { tokens, user } = data;

    await SecureStore.setItemAsync(
      STORAGE_KEYS.ACCESS_TOKEN,
      tokens.accessToken
    );
    await SecureStore.setItemAsync(
      STORAGE_KEYS.REFRESH_TOKEN,
      tokens.refreshToken
    );
    await SecureStore.setItemAsync(STORAGE_KEYS.EXPIRES_AT, tokens.expiresAt);
    await SecureStore.setItemAsync(STORAGE_KEYS.USER, JSON.stringify(user));

    set({
      user,
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });

    Sentry.setUser({
      id: String(user.id),
      email: user.email,
      username: user.full_name,
    });
  },

  login: async (email, password) => {
    try {
      const result = await apiLogin(email, password);
      await get().setAuth(result);
    } catch (error) {
      throw error;
    }
  },

  loginAsGuest: async () => {
    const guestUser: User = {
      id: 0,
      full_name: "Tamu",
      email: "guest@temandifa.com",
    };
    const guestToken = "GUEST_TOKEN";

    await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, guestToken);
    await SecureStore.setItemAsync(
      STORAGE_KEYS.USER,
      JSON.stringify(guestUser)
    );
    await SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN);

    set({
      user: guestUser,
      token: guestToken,
      refreshToken: null,
      isAuthenticated: true,
    });

    Sentry.setUser({
      id: String(guestUser.id),
      email: guestUser.email,
      username: guestUser.full_name,
    });
  },

  logout: async () => {
    const { refreshToken } = get();
    if (refreshToken) {
      try {
        await apiLogout(refreshToken);
      } catch (e) {
        Logger.error("AuthStore", "Logout failed", e);
      }
    }

    await SecureStore.deleteItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
    await SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
    await SecureStore.deleteItemAsync(STORAGE_KEYS.EXPIRES_AT);
    await SecureStore.deleteItemAsync(STORAGE_KEYS.USER);

    set({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
    });

    Sentry.setUser(null);
  },

  register: async (fullName: string, email: string, password: string) => {
    try {
      Logger.info("AuthStore", "Registering new user", { email });
      // Register creates user account
      await apiRegister(fullName, email, password);
      // After successful register, auto-login
      await get().login(email, password);
      Logger.info("AuthStore", "Registration and auto-login successful");
    } catch (error) {
      Logger.error("AuthStore", "Registration failed", error);
      throw error;
    }
  },

  initialize: async () => {
    try {
      set({ loading: true });
      const storedAccessToken = await SecureStore.getItemAsync(
        STORAGE_KEYS.ACCESS_TOKEN
      );
      const storedRefreshToken = await SecureStore.getItemAsync(
        STORAGE_KEYS.REFRESH_TOKEN
      );
      const storedUser = await SecureStore.getItemAsync(STORAGE_KEYS.USER);

      await SecureStore.getItemAsync("biometric_creds", {
        authenticationPrompt: "Memeriksa status biometrik",
      });

      const biometricEnabledFlag = await SecureStore.getItemAsync(
        "biometric_enabled_flag"
      );

      if (storedAccessToken && storedUser) {
        set({
          token: storedAccessToken,
          refreshToken: storedRefreshToken,
          user: JSON.parse(storedUser),
          isAuthenticated: true,
          isBiometricEnabled: biometricEnabledFlag === "true",
        });

        const parsedUser = JSON.parse(storedUser);
        Sentry.setUser({
          id: String(parsedUser.id),
          email: parsedUser.email,
          username: parsedUser.full_name,
        });
      } else {
        set({
          isBiometricEnabled: biometricEnabledFlag === "true",
        });
      }
    } catch (e) {
      Logger.error("AuthStore", "Failed to initialize auth", e);
    } finally {
      set({ loading: false });
    }
  },

  enableBiometrics: async (password: string) => {
    const { user } = get();
    if (!user?.email) throw new Error("User not logged in");

    await SecureStore.setItemAsync("biometric_enabled_flag", "true");

    const credentials = JSON.stringify({ email: user.email, password });
    await SecureStore.setItemAsync("biometric_creds", credentials, {
      requireAuthentication: true,
      authenticationPrompt: "Konfirmasi untuk mengaktifkan login biometrik",
    });

    set({ isBiometricEnabled: true });
  },

  disableBiometrics: async () => {
    await SecureStore.deleteItemAsync("biometric_enabled_flag");
    await SecureStore.deleteItemAsync("biometric_creds");
    set({ isBiometricEnabled: false });
  },

  loginWithBiometrics: async () => {
    try {
      const credentialsJson = await SecureStore.getItemAsync(
        "biometric_creds",
        {
          requireAuthentication: true,
          authenticationPrompt: "Login dengan Biometrik",
        }
      );

      if (credentialsJson) {
        const { email, password } = JSON.parse(credentialsJson);
        await get().login(email, password);
      } else {
        throw new Error("Kredensial biometrik tidak ditemukan");
      }
    } catch (error) {
      throw error;
    }
  },
}));
