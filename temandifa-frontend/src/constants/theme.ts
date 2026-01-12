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
    error: "#FF3B30",
    success: "#34C759",
    warning: "#FF9800",
    // Feature Colors
    featureCamera: "#EA4335",
    featureScan: "#00BFA5",
    featureVoice: "#4285F4", // Slightly different blue for light mode? Or keep consistent? Let's keep consistent branding.
    emergency: "#D93025",
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
    error: "#FF453A",
    success: "#30D158",
    warning: "#FF9F0A",
    // Feature Colors
    featureCamera: "#EA4335", // Red/Orange
    featureScan: "#00BFA5", // Teal
    featureVoice: "#2196F3", // Blue (Primary)
    emergency: "#D93025", // Deep Red
  },
};

export type ThemeType = typeof lightTheme;
