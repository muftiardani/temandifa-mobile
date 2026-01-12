/**
 * FeatureCardSkeleton Component
 *
 * Skeleton placeholder for feature cards on home screen.
 */

import React from "react";
import { View, StyleSheet } from "react-native";
import { Skeleton } from "../atoms/Skeleton";
import { useThemeStore } from "../../stores/themeStore";
import { Spacing, BorderRadius } from "../../constants/layout";

interface FeatureCardSkeletonProps {
  fullWidth?: boolean;
}

export function FeatureCardSkeleton({
  fullWidth = false,
}: FeatureCardSkeletonProps) {
  const { theme } = useThemeStore();

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.colors.border },
        fullWidth && styles.cardFull,
      ]}
    >
      <Skeleton width={32} height={32} borderRadius={8} />
      <Skeleton width="60%" height={20} style={{ marginTop: Spacing.md }} />
    </View>
  );
}

export function FeatureCardRowSkeleton() {
  return (
    <View style={styles.row}>
      <FeatureCardSkeleton />
      <FeatureCardSkeleton />
    </View>
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
  },
  cardFull: {
    width: "100%",
  },
  row: {
    flexDirection: "row",
    gap: Spacing.md,
  },
});

export default FeatureCardSkeleton;
