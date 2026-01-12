import React from "react";
import { StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AccessibleTouchableOpacity } from "../wrappers/AccessibleTouchableOpacity";
import { ThemedText } from "../atoms/ThemedText";
import { BorderRadius, Spacing } from "../../constants/layout";

interface FeatureCardProps {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress: () => void;
  fullWidth?: boolean;
  accessibilityHint: string;
}

export function FeatureCard({
  title,
  icon,
  color,
  onPress,
  fullWidth = false,
  accessibilityHint,
}: FeatureCardProps) {
  return (
    <AccessibleTouchableOpacity
      style={[
        styles.card,
        { backgroundColor: color },
        fullWidth && styles.cardFull,
      ]}
      onPress={onPress}
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint}
    >
      <Ionicons name={icon} size={32} color="white" />
      <ThemedText style={styles.cardText} color="white" variant="title">
        {title}
      </ThemedText>
    </AccessibleTouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    justifyContent: "center",
    alignItems: "flex-start",
    height: 160,
    flex: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  cardFull: {
    width: "100%",
  },
  cardText: {
    marginTop: Spacing.md,
    fontSize: 20, // Override if needed or rely on variant
  },
});
