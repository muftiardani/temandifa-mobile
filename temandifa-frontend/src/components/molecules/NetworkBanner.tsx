import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useThemeStore } from "../../stores/themeStore";
import { useNetworkStatus } from "../../hooks/useNetworkStatus";

export const NetworkBanner: React.FC = () => {
  const { isConnected, checkConnection } = useNetworkStatus();
  const { t } = useTranslation();
  const { theme } = useThemeStore();

  if (isConnected) {
    return null;
  }

  return (
    <View style={[styles.banner, { backgroundColor: theme.colors.error }]}>
      <Ionicons name="cloud-offline" size={20} color="white" />
      <Text style={styles.text}>{t("errors.network")}</Text>
      <TouchableOpacity onPress={checkConnection} style={styles.retryBtn}>
        <Ionicons name="refresh" size={18} color="white" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 10,
  },
  text: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  retryBtn: {
    padding: 6,
  },
});
