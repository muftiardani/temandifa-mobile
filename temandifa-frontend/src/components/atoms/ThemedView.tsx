import React from "react";
import { View, ViewProps } from "react-native";
import { useThemeStore } from "../../stores/themeStore";

interface ThemedViewProps extends ViewProps {
  variant?: "background" | "surface" | "card";
  transparent?: boolean;
}

export function ThemedView({
  style,
  variant = "background",
  transparent = false,
  ...props
}: ThemedViewProps) {
  const { theme } = useThemeStore();

  const backgroundColor = transparent
    ? "transparent"
    : variant === "background"
      ? theme.colors.background
      : theme.colors.surface; // Surface and card usually share same color in this design system

  return <View style={[{ backgroundColor }, style]} {...props} />;
}
