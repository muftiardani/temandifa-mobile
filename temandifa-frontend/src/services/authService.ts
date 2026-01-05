import axios from "axios";

// Gunakan URL dari Environment Variable
const API_URL =
  process.env.EXPO_PUBLIC_API_URL || "http://10.0.2.2:8080/api/v1";

console.log("[AuthService] Initialized with API_URL:", API_URL);

export const login = async (email: string, password: string) => {
  try {
    console.log("[AuthService] Attempting login for:", email);
    const response = await axios.post(`${API_URL}/login`, { email, password });
    console.log("[AuthService] Login success");
    return response.data;
  } catch (error: any) {
    console.error("[AuthService] Login failed:", error.message);
    throw error.response?.data?.error || "Login failed";
  }
};

export const register = async (
  fullName: string,
  email: string,
  password: string
) => {
  try {
    console.log("[AuthService] Attempting register for:", email);
    const response = await axios.post(`${API_URL}/register`, {
      full_name: fullName,
      email,
      password,
    });
    console.log("[AuthService] Register success");
    return response.data;
  } catch (error: any) {
    console.error("[AuthService] Register failed:", error.message);
    throw error.response?.data?.error || "Registration failed";
  }
};
