import { useState } from "react";
import { Alert } from "react-native";
import { Audio } from "expo-av";
import {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  cancelAnimation,
} from "react-native-reanimated";
import Toast from "react-native-toast-message";
import { useTranslation } from "react-i18next";

import { Logger } from "../services/logger";
import { transcribeAudio } from "../services/transcriptionService";

export function useVoiceLogic() {
  const { t } = useTranslation();

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

  return {
    recording,
    isLoading,
    transcription,
    status,
    animatedStyle,
    handlePress,
  };
}
