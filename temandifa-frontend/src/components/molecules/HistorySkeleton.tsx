/**
 * HistorySkeleton Component
 *
 * Skeleton placeholder for history list loading state.
 */

import React from "react";
import { View, StyleSheet } from "react-native";
import { Skeleton } from "../atoms/Skeleton";
import { useThemeStore } from "../../stores/themeStore";
import { Spacing, BorderRadius } from "../../constants/layout";

interface HistorySkeletonProps {
  count?: number;
}

export function HistoryItemSkeleton() {
  const { theme } = useThemeStore();

  return (
    <View style={[styles.item, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.header}>
        <Skeleton width={80} height={24} borderRadius={12} />
        <Skeleton width={100} height={14} />
      </View>
      <Skeleton width="100%" height={16} style={{ marginTop: 8 }} />
      <Skeleton width="70%" height={16} style={{ marginTop: 6 }} />
    </View>
  );
}

export function HistorySkeleton({ count = 5 }: HistorySkeletonProps) {
  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, index) => (
        <HistoryItemSkeleton key={index} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  item: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});

export default HistorySkeleton;
