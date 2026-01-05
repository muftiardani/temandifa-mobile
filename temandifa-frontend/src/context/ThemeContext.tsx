import React, { createContext, useContext, useState, useEffect } from "react";
import { useColorScheme } from "react-native";
import * as SecureStore from "expo-secure-store";
import { lightTheme, darkTheme, ThemeType } from "../constants/theme";

type ThemeContextType = {
  theme: ThemeType;
  isDark: boolean;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType>({
  theme: lightTheme,
  isDark: false,
  toggleTheme: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const systemColorScheme = useColorScheme();
  const [isDark, setIsDark] = useState(systemColorScheme === "dark");

  // Load saved theme preference on mount
  // Load saved theme preference on mount or when system theme changes
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await SecureStore.getItemAsync("theme_preference");
        if (savedTheme) {
          setIsDark(savedTheme === "dark");
        } else {
          // If no preference, use system default
          setIsDark(systemColorScheme === "dark");
        }
      } catch {
        console.log("Failed to load theme preference");
      }
    };
    loadTheme();
  }, [systemColorScheme]);

  const toggleTheme = async () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    try {
      await SecureStore.setItemAsync(
        "theme_preference",
        newIsDark ? "dark" : "light"
      );
    } catch {
      console.log("Failed to save theme preference");
    }
  };

  const theme = isDark ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
