export const lightTheme = {
  dark: false,
  colors: {
    background: "#F2F2F7", // iOS Light Gray
    surface: "#FFFFFF",
    text: "#000000",
    textSecondary: "#666666",
    primary: "#2196F3",
    border: "#E0E0E0",
    card: "#FFFFFF",
    iconDefault: "#333333",
    iconBackground: "#F5F5F5",
    error: "#FF3B30", // iOS Red
    success: "#34C759", // iOS Green
  },
};

export const darkTheme = {
  dark: true,
  colors: {
    background: "#000000",
    surface: "#1C1C1E", // iOS Dark Gray
    text: "#FFFFFF",
    textSecondary: "#EBEBF5",
    primary: "#0A84FF", // iOS Dark Mode Blue
    border: "#38383A",
    card: "#1C1C1E",
    iconDefault: "#FFFFFF",
    iconBackground: "#2C2C2E",
    error: "#FF453A", // iOS Dark Mode Red
    success: "#30D158", // iOS Dark Mode Green (fixed typo in value)
  },
};

export type ThemeType = typeof lightTheme;
