import React from "react";
import { TouchableOpacity, TouchableOpacityProps } from "react-native";

interface AccessibleTouchableOpacityProps extends TouchableOpacityProps {
  accessibilityLabel: string;
  accessibilityHint?: string;
  accessibilityRole?:
    | "button"
    | "link"
    | "image"
    | "keyboardkey"
    | "text"
    | "header"
    | "switch"
    | "checkbox"
    | "radio"
    | "tabbar"
    | "search"
    | "adjustable"
    | "none";
}

export function AccessibleTouchableOpacity({
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = "button",
  ...props
}: AccessibleTouchableOpacityProps) {
  return (
    <TouchableOpacity
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityRole={accessibilityRole}
      {...props}
    />
  );
}
