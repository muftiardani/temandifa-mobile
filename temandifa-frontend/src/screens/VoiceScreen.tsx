import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Alert } from "react-native";
import Toast from "react-native-toast-message";
import { Audio } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  cancelAnimation,
} from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { useThemeStore } from "../stores/themeStore";

import { transcribeAudio } from "../services/transcriptionService";
import { LoadingOverlay } from "../components/molecules/LoadingOverlay";
import { Logger } from "../services/logger";
import { ThemedText } from "../components/atoms/ThemedText";
import { ThemedView } from "../components/atoms/ThemedView";
import { AccessibleTouchableOpacity } from "../components/wrappers/AccessibleTouchableOpacity";

export default function VoiceScreen() {
  const { t } = useTranslation();
  const { theme, isDark } = useThemeStore();

  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [permissionResponse, requestPermission] = Audio.usePermissions();
  const [isLoading, setIsLoading] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [status, setStatus] = useState(t("voice.status_idle"));

  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.3);

  const startAnimation = () => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.5, { duration: 1000, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: 1000, easing: Easing.out(Easing.ease) })
      ),
      -1,
      true
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 1000 }),
        withTiming(0.3, { duration: 1000 })
      ),
      -1,
      true
    );
  };

  const stopAnimation = () => {
    cancelAnimation(scale);
    cancelAnimation(opacity);
    scale.value = withTiming(1);
    opacity.value = withTiming(0.3);
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    };
  });

  async function startRecording() {
    try {
      if (permissionResponse?.status !== "granted") {
        const perms = await requestPermission();
        if (perms.status !== "granted") {
          Toast.show({
            type: "error",
            text1: t("permissions.denied_title"),
            text2: t("permissions.mic_required"),
            visibilityTime: 4000,
          });
          return;
        }
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(recording);
      setStatus(t("voice.status_listening"));
      startAnimation();
    } catch (err) {
      Logger.error("VoiceScreen", "Failed to start recording", err);
      Alert.alert(t("common.error"), t("voice.error_start"));
    }
  }

  async function stopRecording() {
    if (!recording) return;

    setStatus(t("voice.status_processing"));
    stopAnimation();
    setRecording(null);
    setIsLoading(true);

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();

      if (uri) {
        const result = await transcribeAudio(uri);
        setTranscription(result.text || "");
        setStatus(t("voice.status_done"));
      }
    } catch (error) {
      Logger.error("VoiceScreen", "Failed to stop recording", error);
      Alert.alert(t("voice.status_failed"), t("voice.error_process"));
    } finally {
      setIsLoading(false);
    }
  }

  const handlePress = () => {
    if (recording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.headerContainer}>
        <ThemedText variant="title" style={styles.statusText}>
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
