import React from "react";
import { View, StyleSheet, ScrollView, SafeAreaView } from "react-native";
import { Image } from "expo-image";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { useOCRScan } from "../hooks/useOCRScan";
import { RootStackParamList } from "../types/navigation";
import { LoadingOverlay } from "../components/molecules/LoadingOverlay";
import { useThemeStore } from "../stores/themeStore";
import { ThemedText } from "../components/atoms/ThemedText";
import { ThemedView } from "../components/atoms/ThemedView";
import { AccessibleTouchableOpacity } from "../components/wrappers/AccessibleTouchableOpacity";
import { useScreenReaderFocus } from "../hooks/useScreenReaderFocus";

type ScanScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "Scan"
>;

export default function ScanScreen() {
  const navigation = useNavigation<ScanScreenNavigationProp>();
  const { t } = useTranslation();
  const { theme } = useThemeStore();
  const focusRef = useScreenReaderFocus();

  // Use Custom Hook for Logic
  const { loading, ocrResult, selectedImage, handleUpload, reset, speak } =
    useOCRScan();

  const handleCamera = () => {
    navigation.navigate("DocumentScanner");
  };

  if (selectedImage && ocrResult !== null) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <ThemedView
          style={[
            styles.resultHeader,
            { borderBottomColor: theme.colors.border },
          ]}
          variant="surface"
        >
          <ThemedText variant="title" style={styles.headerTitle} ref={focusRef}>
            {t("scan.result_title")}
          </ThemedText>
        </ThemedView>

        <Image
          source={{ uri: selectedImage }}
          style={styles.previewImage}
          contentFit="contain"
        />

        <ThemedView style={styles.textArea} variant="surface">
          <ThemedText variant="subtitle" style={styles.sectionLabel}>
            {t("scan.result_text")}
          </ThemedText>
          <ScrollView style={styles.resultScroll}>
            <ThemedText style={styles.resultText}>{ocrResult}</ThemedText>
          </ScrollView>
        </ThemedView>

        <ThemedView style={styles.resultFooter} variant="surface">
          <AccessibleTouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: theme.colors.primary },
            ]}
            onPress={speak}
            accessibilityLabel={t("scan.read")}
            accessibilityRole="button"
          >
            <Ionicons name="volume-high" size={24} color="white" />
            <ThemedText style={styles.actionText} color="white">
              {t("scan.read")}
            </ThemedText>
          </AccessibleTouchableOpacity>

          <AccessibleTouchableOpacity
            style={[
              styles.actionButton,
              styles.secondaryButton,
              {
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.background,
              },
            ]}
            onPress={reset}
            accessibilityLabel={t("scan.retry")}
            accessibilityRole="button"
          >
            <Ionicons name="refresh" size={24} color={theme.colors.text} />
            <ThemedText style={styles.actionText}>{t("scan.retry")}</ThemedText>
          </AccessibleTouchableOpacity>
        </ThemedView>

        {loading && <LoadingOverlay />}
      </SafeAreaView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.menuContainer}>
        <ThemedText
          variant="title"
          style={styles.menuHeader}
          ref={!selectedImage ? focusRef : undefined}
        >
          {t("scan.method_title")}
        </ThemedText>

        <AccessibleTouchableOpacity
          style={[
            styles.menuCard,
            { backgroundColor: theme.colors.featureCamera },
          ]}
          onPress={handleCamera}
          accessibilityLabel={t("menu.camera")}
          accessibilityRole="button"
        >
          <View style={styles.iconCircle}>
            <Ionicons
              name="camera"
              size={40}
              color={theme.colors.featureCamera}
            />
          </View>
          <View style={styles.cardContent}>
            <ThemedText variant="title" style={styles.cardTitle} color="white">
              {t("menu.camera")}
            </ThemedText>
            <ThemedText
              style={styles.cardSubtitle}
              color="rgba(255,255,255,0.9)"
            >
              {t("scan.camera_desc")}
            </ThemedText>
          </View>
          <Ionicons name="chevron-forward" size={24} color="white" />
        </AccessibleTouchableOpacity>

        <AccessibleTouchableOpacity
          style={[
            styles.menuCard,
            { backgroundColor: theme.colors.featureScan },
          ]}
          onPress={handleUpload}
          accessibilityLabel={t("menu.gallery")}
          accessibilityRole="button"
        >
          <View style={styles.iconCircle}>
            <Ionicons
              name="images"
              size={40}
              color={theme.colors.featureScan}
            />
          </View>
          <View style={styles.cardContent}>
            <ThemedText variant="title" style={styles.cardTitle} color="white">
              {t("menu.gallery")}
            </ThemedText>
            <ThemedText
              style={styles.cardSubtitle}
              color="rgba(255,255,255,0.9)"
            >
              {t("scan.gallery_desc")}
            </ThemedText>
          </View>
          <Ionicons name="chevron-forward" size={24} color="white" />
        </AccessibleTouchableOpacity>
      </View>
      {loading && <LoadingOverlay />}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  menuContainer: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    gap: 20,
  },
  menuHeader: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  menuCard: {
    borderRadius: 20,
    padding: 20,
    height: 120,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardCamera: {
    // backgroundColor handled inline with theme
  },
  cardUpload: {
    // backgroundColor handled inline with theme
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
  },
  resultHeader: {
    padding: 16,
    borderBottomWidth: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  previewImage: {
    width: "100%",
    height: 250,
    backgroundColor: "#333", // Dark gray placeholder can stay or use a neutral theme color
  },
  textArea: {
    flex: 1,
    padding: 20,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 8,
  },
  resultScroll: {
    flex: 1,
  },
  resultText: {
    fontSize: 18,
    lineHeight: 28,
  },
  resultFooter: {
    padding: 20,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    flex: 1,
    // backgroundColor: "#2196F3", // Replaced by theme
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  secondaryButton: {
    borderWidth: 1,
  },
  actionText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
});
