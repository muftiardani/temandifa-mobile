import React from "react";
import { ViewStyle, StyleSheet, DimensionValue } from "react-native";
import { MotiView } from "moti";
import { useThemeStore } from "../../stores/themeStore";

interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: ViewStyle;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = "100%",
  height = 20,
  borderRadius = 4,
  style,
}) => {
  const { theme } = useThemeStore();

  return (
    <MotiView
      from={{ opacity: 0.5 }}
      animate={{ opacity: 0.9 }}
      transition={{
        type: "timing",
        duration: 1000,
        loop: true,
      }}
      style={[
        styles.container,
        {
          width,
          height,
          borderRadius,
          backgroundColor: theme.colors.border, // Use border color as base skeleton color
        },
        style,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
  },
});
