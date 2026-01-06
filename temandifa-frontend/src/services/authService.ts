import apiClient, { getErrorMessage } from "./apiClient";

console.log("[AuthService] Initialized");

interface LoginResponse {
  token: string;
  user: {
    id: number;
    full_name: string;
    email: string;
  };
}

interface RegisterResponse {
  message: string;
  user: {
    id: number;
    full_name: string;
    email: string;
  };
}

export const login = async (
  email: string,
  password: string
): Promise<LoginResponse> => {
  try {
    console.log("[AuthService] Attempting login for:", email);
    const response = await apiClient.post<LoginResponse>("/login", {
      email,
      password,
    });
    console.log("[AuthService] Login success");
    return response.data;
  } catch (error: unknown) {
    console.error("[AuthService] Login failed:", getErrorMessage(error));
    throw getErrorMessage(error);
  }
};

export const register = async (
  fullName: string,
  email: string,
  password: string
): Promise<RegisterResponse> => {
  try {
    console.log("[AuthService] Attempting register for:", email);
    const response = await apiClient.post<RegisterResponse>("/register", {
      full_name: fullName,
      email,
      password,
    });
    console.log("[AuthService] Register success");
    return response.data;
  } catch (error: unknown) {
    console.error("[AuthService] Register failed:", getErrorMessage(error));
    throw getErrorMessage(error);
  }
};
