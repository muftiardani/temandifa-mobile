import apiClient, { getErrorMessage } from "./apiClient";
import { AuthResponseSchema, User } from "../schemas/auth";

import { Logger } from "./logger";

Logger.info("AuthService", "Initialized");

export interface LoginResult {
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresAt: string;
  };
  user: User;
}

export const login = async (
  email: string,
  password: string
): Promise<LoginResult> => {
  try {
    Logger.info("AuthService", "Attempting login for:", { email });
    const response = await apiClient.post("/login", {
      email,
      password,
    });

    // Validate with Zod
    Logger.info("AuthService", "Validating login response...");
    const parsed = AuthResponseSchema.parse(response.data);
    const data = parsed.data;

    Logger.info("AuthService", "Login success");

    return {
      tokens: {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: data.expires_at,
      },
      user: data.user,
    };
  } catch (error: unknown) {
    Logger.error("AuthService", "Login failed:", getErrorMessage(error));
    throw getErrorMessage(error);
  }
};

export const register = async (
  fullName: string,
  email: string,
  password: string
): Promise<User> => {
  try {
    // Using Zod for basic validation if needed, currently assuming API returns User object directly
    const response = await apiClient.post("/register", {
      full_name: fullName,
      email,
      password,
    });

    if (response.data?.data) {
      return response.data.data as User;
    }
    throw new Error("Invalid register response");
  } catch (error: unknown) {
    Logger.error("AuthService", "Register failed:", getErrorMessage(error));
    throw getErrorMessage(error);
  }
};

export const refreshTokens = async (
  refreshToken: string
): Promise<LoginResult> => {
  try {
    Logger.info("AuthService", "Refreshing tokens...");
    const response = await apiClient.post("/refresh", {
      refresh_token: refreshToken,
    });

    // Validate with Zod
    const parsed = AuthResponseSchema.parse(response.data);
    const data = parsed.data;

    Logger.info("AuthService", "Token refresh success");

    return {
      tokens: {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: data.expires_at,
      },
      user: data.user,
    };
  } catch (error: unknown) {
    Logger.error(
      "AuthService",
      "Token refresh failed:",
      getErrorMessage(error)
    );
    throw getErrorMessage(error);
  }
};

export const logout = async (refreshToken: string): Promise<void> => {
  try {
    await apiClient.post("/logout", { refresh_token: refreshToken });
    Logger.info("AuthService", "Logout success");
  } catch (error: unknown) {
    Logger.warn(
      "AuthService",
      "Logout request failed (ignored):",
      getErrorMessage(error)
    );
  }
};
