import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../../context/ThemeContext";

export default function AboutScreen() {
  const { theme } = useTheme();

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.logoContainer}>
        {/* Placeholder Logo */}
        <View
          style={[
            styles.logoPlaceholder,
            { backgroundColor: theme.colors.primary },
          ]}
        >
          <Text style={styles.logoText}>TD</Text>
        </View>
        <Text style={[styles.appName, { color: theme.colors.text }]}>
          TemanDifa
        </Text>
        <Text style={[styles.version, { color: theme.colors.textSecondary }]}>
          Versi 1.0.0 (MVP)
        </Text>
      </View>

      <View style={styles.infoContainer}>
        <Text style={[styles.description, { color: theme.colors.text }]}>
          TemanDifa adalah asisten digital cerdas yang dirancang untuk membantu
          teman-teman difabel netra dalam mengenali objek, membaca teks, dan
          beraktivitas sehari-hari.
        </Text>

        <Text
          style={[styles.creditTitle, { color: theme.colors.textSecondary }]}
        >
          Dikembangkan oleh:
        </Text>
        <Text style={[styles.creditName, { color: theme.colors.text }]}>
          Tim Developer TemanDifa
        </Text>
        <Text style={[styles.copyright, { color: theme.colors.textSecondary }]}>
          © 2026 TemanDifa Project
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    padding: 24,
  },
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
