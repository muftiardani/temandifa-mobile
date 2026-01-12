import React from "react";
import { View, StyleSheet } from "react-native";
import { Skeleton } from "../atoms/Skeleton";
import { ThemedView } from "../atoms/ThemedView";
import { Spacing, BorderRadius } from "../../constants/layout";

export const HistoryListSkeleton: React.FC = () => {
  // Create an array of 5 items to simulate a list
  const items = Array.from({ length: 5 }, (_, i) => i);

  return (
    <View style={styles.container}>
      {items.map((item) => (
        <ThemedView key={item} variant="surface" style={styles.itemContainer}>
          {/* Icon Skeleton */}
          <Skeleton
            width={40}
            height={40}
            borderRadius={20}
            style={styles.iconSkeleton}
          />

          {/* Text Content Skeleton */}
          <View style={styles.textContainer}>
            {/* Title */}
            <Skeleton width="70%" height={16} style={styles.marginBottom} />
            {/* Date */}
            <Skeleton width="40%" height={12} style={styles.marginBottom} />
            {/* Type */}
            <Skeleton width="20%" height={12} />
          </View>

          {/* Delete Button Skeleton */}
          <Skeleton width={24} height={24} borderRadius={12} />
        </ThemedView>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: Spacing.md,
  },
  itemContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    // Add shadow to match real items
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  iconSkeleton: {
    marginRight: Spacing.md,
  },
  textContainer: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  marginBottom: {
    marginBottom: 6,
  },
});
