import React from "react";
import { StyleSheet, View, Alert } from "react-native";
import { FlashList, ListRenderItem } from "@shopify/flash-list";
import { Ionicons } from "@expo/vector-icons";

import { useThemeStore } from "../stores/themeStore";
import { ThemedText } from "../components/atoms/ThemedText";
import { ThemedView } from "../components/atoms/ThemedView";
import { AccessibleTouchableOpacity } from "../components/wrappers/AccessibleTouchableOpacity";
import { HistoryItem } from "../services/historyService";
import { useHistoryQuery, useDeleteHistoryMutation } from "../hooks/useHistory";
import { HistoryListSkeleton } from "../components/organisms/HistoryListSkeleton";
import { Spacing, BorderRadius } from "../constants/layout";
import { useTranslation } from "react-i18next";

export default function HistoryScreen() {
  const { theme } = useThemeStore();
  const { t } = useTranslation();

  const { data, isLoading, refetch, isRefetching } = useHistoryQuery();

  const history = data?.items ?? [];

  const deleteMutation = useDeleteHistoryMutation();

  const onRefresh = () => {
    refetch();
  };

  const handleDelete = React.useCallback(
    (id: number) => {
      Alert.alert(
        t("auth.history_delete_title"),
        t("auth.history_delete_confirm"),
        [
          { text: t("auth.cancel_btn"), style: "cancel" },
          {
            text: t("auth.delete"),
            style: "destructive",
            onPress: () => {
              deleteMutation.mutate(id);
            },
          },
        ]
      );
    },
    [t, deleteMutation]
  );

  const getIconName = (type: string) => {
    switch (type) {
      case "OBJECT":
        return "camera";
      case "ocr": // Handle inconsistent casing if any
      case "OCR":
        return "scan";
      case "VOICE":
        return "mic";
      default:
        return "time";
    }
  };

  const renderItem: ListRenderItem<HistoryItem> = React.useCallback(
    ({ item }) => {
      const formattedDate = new Date(item.CreatedAt).toLocaleDateString();
      const formattedTime = new Date(item.CreatedAt).toLocaleTimeString();
      const resultText = item.result_text || "Tidak ada hasil";

      // Comprehensive label for TalkBack
      const a11yLabel = `Riwayat ${item.feature_type}. Hasil: ${resultText}. Tanggal: ${formattedDate} pukul ${formattedTime}. Ketuk dua kali untuk menghapus.`;

      return (
        <ThemedView variant="surface" style={styles.itemContainer}>
          <AccessibleTouchableOpacity
            style={{ flex: 1, flexDirection: "row", alignItems: "center" }}
            onPress={() => handleDelete(item.ID)}
            accessibilityLabel={a11yLabel}
            accessibilityHint="Menghapus item ini dari riwayat"
          >
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: theme.colors.primary + "20" },
              ]}
            >
              <Ionicons
                name={getIconName(item.feature_type)}
                size={24}
                color={theme.colors.primary}
                importantForAccessibility="no-hide-descendants"
              />
            </View>
            <View style={styles.textContainer}>
              <ThemedText variant="subtitle" numberOfLines={1}>
                {resultText}
              </ThemedText>
              <ThemedText variant="caption" color={theme.colors.textSecondary}>
                {formattedDate} • {formattedTime}
              </ThemedText>
              <ThemedText variant="caption" color={theme.colors.textSecondary}>
                {item.feature_type}
              </ThemedText>
            </View>
            <View style={styles.deleteButton}>
              <Ionicons
                name="trash-outline"
                size={20}
                color={theme.colors.error}
                importantForAccessibility="no-hide-descendants"
              />
            </View>
          </AccessibleTouchableOpacity>
        </ThemedView>
      );
    },
    [theme, handleDelete]
  );

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <HistoryListSkeleton />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {history.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons
            name="time-outline"
            size={64}
            color={theme.colors.textSecondary}
          />
          <ThemedText
            style={styles.emptyText}
            color={theme.colors.textSecondary}
          >
            Belum ada riwayat aktivitas.
          </ThemedText>
        </View>
      ) : (
        <FlashList
          data={history}
          renderItem={renderItem}
          // @ts-expect-error - FlashList types might misbehave with strict TS
          estimatedItemSize={80}
          onRefresh={onRefresh}
          refreshing={isRefetching}
          contentContainerStyle={styles.listContent}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    padding: Spacing.md,
  },
  itemContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  textContainer: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  deleteButton: {
    padding: Spacing.xs,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    opacity: 0.7,
  },
  emptyText: {
    marginTop: Spacing.md,
    fontSize: 16,
  },
});
