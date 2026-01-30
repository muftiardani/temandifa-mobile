/**
 * OfflineBanner Component
 *
 * Displays a banner when the device is offline and shows pending sync count.
 */

import React from "react";
import { View, StyleSheet, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  withTiming,
  useSharedValue,
  withRepeat,
  withSequence,
} from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { useOfflineQueue } from "../../hooks/useOfflineQueue";
import { useThemeStore } from "../../stores/themeStore";

export function OfflineBanner() {
  const { status, syncNow } = useOfflineQueue();
  const { t } = useTranslation();
  const { theme } = useThemeStore();
  const pulseAnim = useSharedValue(1);

  // Pulse animation when syncing
  React.useEffect(() => {
    if (status.isSyncing) {
      pulseAnim.value = withRepeat(
        withSequence(
          withTiming(0.7, { duration: 500 }),
          withTiming(1, { duration: 500 })
        ),
        -1,
        true
      );
    } else {
      pulseAnim.value = withTiming(1);
    }
  }, [status.isSyncing, pulseAnim]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: pulseAnim.value,
  }));

  // Don't show if online and no pending
  if (status.isOnline && status.pendingCount === 0) {
    return null;
  }

  const handleSync = async () => {
    if (status.isOnline && !status.isSyncing) {
      await syncNow();
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: status.isOnline
            ? theme.colors.success
            : theme.colors.warning,
        },
        animatedStyle,
      ]}
    >
      <View style={styles.content}>
        <Ionicons
          name={status.isOnline ? "cloud-upload" : "cloud-offline"}
          size={18}
          color="white"
        />
        <Text style={styles.text}>
          {status.isOnline
            ? status.isSyncing
              ? t("menu.offline_syncing")
              : t("menu.offline_waiting", { count: status.pendingCount })
            : t("menu.offline_mode")}
        </Text>
      </View>

      {status.isOnline && status.pendingCount > 0 && !status.isSyncing && (
        <TouchableOpacity onPress={handleSync} style={styles.syncButton}>
          <Ionicons name="sync" size={18} color="white" />
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  text: {
    color: "white",
    fontSize: 13,
    fontWeight: "500",
  },
  syncButton: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
});
