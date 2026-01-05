import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
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
import { useTheme } from "../context/ThemeContext";

import { transcribeAudio } from "../services/transcriptionService";
import { LoadingOverlay } from "../components/LoadingOverlay";

export default function VoiceScreen() {
  const { t } = useTranslation();
  const { theme, isDark } = useTheme();

  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [permissionResponse, requestPermission] = Audio.usePermissions();
  const [isLoading, setIsLoading] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [status, setStatus] = useState(t("voice.status_idle"));

  // Animation values
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
          Alert.alert(
            t("permissions.denied_title"),
            t("permissions.mic_required")
          );
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
      console.error("Failed to start recording", err);
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
        // Corrected: result is directly TranscriptionResult (unwrapped by service)
        setTranscription(result.text || "");
        setStatus(t("voice.status_done"));
      }
    } catch (error) {
      console.error(error);
      setStatus(t("voice.status_failed"));
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
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.headerContainer}>
        <Text style={[styles.statusText, { color: theme.colors.text }]}>
          {status}
        </Text>
      </View>

      <View style={styles.micContainer}>
        {recording && (
          <Animated.View
            style={[
              styles.pulseCircle,
              animatedStyle,
              {
                backgroundColor: isDark
                  ? "rgba(33, 150, 243, 0.3)"
                  : "rgba(33, 150, 243, 0.5)",
              },
            ]}
          />
        )}

        <TouchableOpacity
          style={[
            styles.micButton,
            recording && styles.micButtonActive,
            { shadowColor: theme.colors.primary },
          ]}
          onPress={handlePress}
          activeOpacity={0.8}
        >
          <Ionicons name={recording ? "stop" : "mic"} size={50} color="white" />
        </TouchableOpacity>
      </View>

      <View
        style={[
          styles.resultContainer,
          { backgroundColor: theme.colors.surface },
        ]}
      >
        {transcription ? (
          <>
            <Text
              style={[
                styles.resultLabel,
                { color: theme.colors.textSecondary },
              ]}
            >
              {t("voice.result_label")}
            </Text>
            <ScrollView contentContainerStyle={styles.scrollContent}>
              <Text style={[styles.resultText, { color: theme.colors.text }]}>
                {transcription}
              </Text>
            </ScrollView>
          </>
        ) : (
          <Text
            style={[styles.hintText, { color: theme.colors.textSecondary }]}
          >
            {t("voice.hint")}
          </Text>
        )}
      </View>

      {isLoading && <LoadingOverlay />}
    </View>
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
    backgroundColor: "#2196F3", // Android Blue
    justifyContent: "center",
    alignItems: "center",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 10,
  },
  micButtonActive: {
    backgroundColor: "#F44336", // Red for stop
    shadowColor: "#F44336",
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
