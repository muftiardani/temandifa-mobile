import React, { createContext, useState, useContext, useEffect } from "react";
import * as SecureStore from "expo-secure-store";
import axios from "axios";

interface User {
  id: number;
  full_name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (token: string, user: User) => Promise<void>;
  loginAsGuest: () => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

// API URL config

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStorageData();
  }, []);

  async function loadStorageData() {
    try {
      const storedToken = await SecureStore.getItemAsync("token");
      const storedUser = await SecureStore.getItemAsync("user");

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        // Set default axios header
        if (storedToken !== "GUEST_TOKEN") {
          axios.defaults.headers.common[
            "Authorization"
          ] = `Bearer ${storedToken}`;
        }
      }
    } catch (e) {
      console.error("Failed to load auth data", e);
    } finally {
      setLoading(false);
    }
  }

  async function login(newToken: string, newUser: User) {
    setToken(newToken);
    setUser(newUser);
    axios.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;

    await SecureStore.setItemAsync("token", newToken);
    await SecureStore.setItemAsync("user", JSON.stringify(newUser));
  }

  async function loginAsGuest() {
    const guestUser: User = {
      id: 0,
      full_name: "Tamu",
      email: "guest@temandifa.com",
    };
    const guestToken = "GUEST_TOKEN";

    setToken(guestToken);
    setUser(guestUser);

    // Guest doesn't need Bearer token for now, or maybe handle in services
    delete axios.defaults.headers.common["Authorization"];

    await SecureStore.setItemAsync("token", guestToken);
    await SecureStore.setItemAsync("user", JSON.stringify(guestUser));
  }

  async function logout() {
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common["Authorization"];

    await SecureStore.deleteItemAsync("token");
    await SecureStore.deleteItemAsync("user");
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        loginAsGuest,
        logout,
        isAuthenticated: !!token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
