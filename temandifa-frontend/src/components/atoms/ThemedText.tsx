import React from "react";
import { Text, TextProps, StyleSheet } from "react-native";
import { useThemeStore } from "../../stores/themeStore";
import { FontSize } from "../../constants/layout";

interface ThemedTextProps extends TextProps {
  variant?: "default" | "title" | "subtitle" | "caption" | "link";
  color?: string; // Override color if needed
}

export function ThemedText({
  style,
  variant = "default",
  color,
  ...props
}: ThemedTextProps) {
  const { theme } = useThemeStore();

  let variantStyle = {};
  let defaultColor = theme.colors.text;

  switch (variant) {
    case "title":
      variantStyle = styles.title;
      break;
    case "subtitle":
      variantStyle = styles.subtitle;
      defaultColor = theme.colors.textSecondary;
      break;
    case "caption":
      variantStyle = styles.caption;
      defaultColor = theme.colors.textSecondary;
      break;
    case "link":
      variantStyle = styles.link;
      defaultColor = theme.colors.primary;
      break;
    default:
      variantStyle = styles.default;
  }

  return (
    <Text
      style={[{ color: color || defaultColor }, variantStyle, style]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontSize: FontSize.md,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: "bold",
  },
  subtitle: {
    fontSize: FontSize.md,
    lineHeight: 24,
  },
  caption: {
    fontSize: FontSize.xs,
  },
  link: {
    fontSize: FontSize.md,
    fontWeight: "600",
  },
});
