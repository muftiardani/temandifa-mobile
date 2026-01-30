import React from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { useThemeStore } from "../stores/themeStore";

import { useVoiceLogic } from "../hooks/useVoiceLogic";
import { LoadingOverlay } from "../components/molecules/LoadingOverlay";
import { ThemedText } from "../components/atoms/ThemedText";
import { ThemedView } from "../components/atoms/ThemedView";
import { AccessibleTouchableOpacity } from "../components/wrappers/AccessibleTouchableOpacity";
import { useScreenReaderFocus } from "../hooks/useScreenReaderFocus";

export default function VoiceScreen() {
  const { t } = useTranslation();
  const { theme, isDark } = useThemeStore();
  const focusRef = useScreenReaderFocus();

  const {
    recording,
    isLoading,
    transcription,
    status,
    animatedStyle,
    handlePress,
  } = useVoiceLogic();

  return (
    <ThemedView style={styles.container}>
      <View style={styles.headerContainer}>
        <ThemedText variant="title" style={styles.statusText} ref={focusRef}>
          {status}
        </ThemedText>
      </View>

      <View style={styles.micContainer}>
        {recording && (
          <Animated.View
            style={[
              styles.pulseCircle,
              animatedStyle,
              {
                backgroundColor: theme.colors.primary + (isDark ? "4D" : "80"), // 30% vs 50% opacity
              },
            ]}
          />
        )}

        <AccessibleTouchableOpacity
          style={[
            styles.micButton,
            recording && styles.micButtonActive,
            {
              backgroundColor: recording
                ? theme.colors.error
                : theme.colors.primary,
              shadowColor: recording
                ? theme.colors.error
                : theme.colors.primary,
            },
          ]}
          onPress={handlePress}
          activeOpacity={0.8}
          accessibilityLabel={
            recording
              ? t("voice.stop_recording_hint")
              : t("voice.start_recording_hint")
          }
          accessibilityHint={
            recording
              ? "Ketuk untuk berhenti merekam dan memproses suara"
              : "Ketuk untuk mulai merekam suara"
          }
          accessibilityRole="button"
        >
          <Ionicons name={recording ? "stop" : "mic"} size={50} color="white" />
        </AccessibleTouchableOpacity>
      </View>

      <ThemedView style={styles.resultContainer} variant="surface">
        {transcription ? (
          <>
            <ThemedText variant="subtitle" style={styles.resultLabel}>
              {t("voice.result_label")}
            </ThemedText>
            <ScrollView contentContainerStyle={styles.scrollContent}>
              <ThemedText style={styles.resultText}>{transcription}</ThemedText>
            </ScrollView>
          </>
        ) : (
          <ThemedText
            variant="subtitle"
            style={styles.hintText}
            color={theme.colors.textSecondary}
          >
            {t("voice.hint")}
          </ThemedText>
        )}
      </ThemedView>

      {isLoading && <LoadingOverlay />}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    padding: 24,
  },
  headerContainer: {
    marginTop: 40,
    marginBottom: 40,
  },
  statusText: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
  },
  micContainer: {
    justifyContent: "center",
    alignItems: "center",
    width: 200,
    height: 200,
    marginBottom: 30,
  },
  pulseCircle: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
  },
  micButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#2196F3", // Default, overwritten by inline style
    justifyContent: "center",
    alignItems: "center",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 10,
  },
  micButtonActive: {
    // backgroundColor handled by inline style for theme
  },
  resultContainer: {
    flex: 1,
    width: "100%",
    borderRadius: 20,
    padding: 20,
  },
  resultLabel: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  resultText: {
    fontSize: 18,
    lineHeight: 28,
  },
  hintText: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    marginTop: 20,
  },
});
