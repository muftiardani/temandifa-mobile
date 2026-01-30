import React from "react";
import { View, StyleSheet } from "react-native";
import { useThemeStore } from "../../stores/themeStore";
import { ThemedText } from "../../components/atoms/ThemedText";
import { InfoScreenLayout } from "../../components/layouts/InfoScreenLayout";

export default function AboutScreen() {
  const { theme } = useThemeStore();

  return (
    <InfoScreenLayout
      title="Tentang"
      contentContainerStyle={{ alignItems: "center" }}
    >
      <View style={styles.logoContainer}>
        <View
          style={[
            styles.logoPlaceholder,
            { backgroundColor: theme.colors.primary },
          ]}
        >
          <ThemedText style={styles.logoText} color="white">
            TD
          </ThemedText>
        </View>
        <ThemedText variant="title" style={styles.appName}>
          TemanDifa
        </ThemedText>
        <ThemedText style={styles.version} color={theme.colors.textSecondary}>
          Versi 1.0.0 (MVP)
        </ThemedText>
      </View>

      <View style={styles.infoContainer}>
        <ThemedText style={styles.description}>
          TemanDifa adalah asisten digital cerdas yang dirancang untuk membantu
          teman-teman difabel netra dalam mengenali objek, membaca teks, dan
          beraktivitas sehari-hari.
        </ThemedText>

        <ThemedText
          style={styles.creditTitle}
          color={theme.colors.textSecondary}
        >
          Dikembangkan oleh:
        </ThemedText>
        <ThemedText variant="subtitle" style={styles.creditName}>
          Tim Developer TemanDifa
        </ThemedText>
        <ThemedText style={styles.copyright} color={theme.colors.textSecondary}>
          © 2026 TemanDifa Project
        </ThemedText>
      </View>
    </InfoScreenLayout>
  );
}

const styles = StyleSheet.create({
  logoContainer: {
    alignItems: "center",
    marginTop: 60,
    marginBottom: 40,
  },
  logoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  logoText: {
    fontSize: 40,
    fontWeight: "bold",
    color: "white",
  },
  appName: {
    fontSize: 28,
    fontWeight: "bold",
  },
  version: {
    fontSize: 16,
    marginTop: 4,
  },
  infoContainer: {
    width: "100%",
  },
  description: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 40,
  },
  creditTitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 4,
  },
  creditName: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 40,
  },
  copyright: {
    fontSize: 14,
    textAlign: "center",
  },
});
