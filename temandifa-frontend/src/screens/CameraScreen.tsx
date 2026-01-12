import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import { useState, useRef } from "react";
import {
  Button,
  StyleSheet,
  View,
  Image,
  ActivityIndicator,
  ScrollView,
  Switch,
  Text,
} from "react-native";
import * as Speech from "expo-speech";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import Toast from "react-native-toast-message";

import { useThemeStore } from "../stores/themeStore";
import { Logger } from "../services/logger";

import { detectObject } from "../services/detectionService";
import { askAboutImage } from "../services/vqaService";
import { saveHistory } from "../services/historyService";
import { LoadingOverlay } from "../components/molecules/LoadingOverlay";
import { DetectionItem } from "../schemas/detection";
import { haptics } from "../utils/haptics";
import { optimizeImageForDetection, optimizeImage } from "../utils/imageUtils";
import { ThemedText } from "../components/atoms/ThemedText";
import { ThemedView } from "../components/atoms/ThemedView";
import { AccessibleTouchableOpacity } from "../components/wrappers/AccessibleTouchableOpacity";

export default function CameraScreen() {
  const [facing, setFacing] = useState<CameraType>("back");
  const [permission, requestPermission] = useCameraPermissions();
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [detections, setDetections] = useState<DetectionItem[]>([]);
  const [smartMode, setSmartMode] = useState(false);
  const [smartDescription, setSmartDescription] = useState<string | null>(null);

  const { t } = useTranslation();
  const { theme } = useThemeStore();

  const cameraRef = useRef<CameraView>(null);

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <ThemedText style={styles.message} color="white">
          {t("camera.permission_msg")}
        </ThemedText>
        <Button
          onPress={requestPermission}
          title={t("camera.permission_grant")}
        />
      </View>
    );
  }

  async function takePicture() {
    if (cameraRef.current) {
      try {
        await haptics.medium();

        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: false,
        });
        if (photo) {
          setImage(photo.uri);
          processImage(photo.uri);
        }
      } catch (e) {
        Logger.error("CameraScreen", "Failed to take picture", e);
        haptics.error();
        Toast.show({
          type: "error",
          text1: t("camera.error_capture"),
          text2: t("common.retry"),
          visibilityTime: 3000,
        });
      }
    }
  }

  async function processImage(uri: string) {
    setLoading(true);
    setDetections([]);
    setSmartDescription(null);
    try {
      if (smartMode) {
        // Smart VQA Mode
        // Using slighty better quality for VQA
        const optimizedUri = await optimizeImage(uri, {
          maxWidth: 1024,
          quality: 0.7,
        });

        // Default "Describe" prompt
        const prompt =
          "Deskripsikan apa yang ada di gambar ini secara detail untuk membantu tunanetra.";
        const response = await askAboutImage(optimizedUri, prompt);

        if (response.data && response.data.success) {
          const answer = response.data.answer;
          setSmartDescription(answer);
          haptics.success();
          Speech.speak(answer);

          try {
            await saveHistory("VQA", uri, answer);
          } catch (err) {}
        } else {
          throw new Error(response.error || "VQA Failed");
        }
      } else {
        // Standard Detection Mode
        const optimizedUri = await optimizeImageForDetection(uri);
        const response = await detectObject(optimizedUri);

        if (response.data) {
          setDetections(response.data);

          const labels = response.data.map((d) => d.label).join(", ");
          if (labels) {
            haptics.success();
            Speech.speak(t("voice.result_label") + " " + labels);

            try {
              await saveHistory("OBJECT", uri, labels);
            } catch (err) {}
          } else {
            Speech.speak(t("camera.no_object"));
          }
        }
      }
    } catch (error) {
      Logger.error("CameraScreen", "Processing error", error);
      haptics.error();
      Speech.speak(t("camera.error_detect"));
      Toast.show({
        type: "error",
        text1: t("camera.error_detect"),
        text2: t("errors.network"),
        visibilityTime: 4000,
      });
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setImage(null);
    setDetections([]);
    setSmartDescription(null);
    Speech.stop();
  }

  function toggleCameraFacing() {
    setFacing((current) => (current === "back" ? "front" : "back"));
  }

  if (image) {
    return (
      <View style={styles.container}>
        <Image source={{ uri: image }} style={styles.preview} />
        {loading && <LoadingOverlay />}

        {!loading && (
          <ThemedView style={styles.resultPanel} variant="surface">
            <View style={styles.resultHeader}>
              <ThemedText variant="title" style={styles.resultTitle}>
                {smartMode ? "Deskripsi AI" : t("camera.result_title")}
              </ThemedText>
              {!smartMode && (
                <ThemedText
                  style={styles.resultCount}
                  color={theme.colors.textSecondary}
                >
                  {t("camera.result_found", { count: detections.length })}
                </ThemedText>
              )}
            </View>

            <ScrollView style={styles.resultList}>
              {smartMode ? (
                <ThemedText style={styles.descriptionText}>
                  {smartDescription}
                </ThemedText>
              ) : detections.length === 0 ? (
                <ThemedText
                  style={styles.noResultText}
                  color={theme.colors.textSecondary}
                >
                  {t("camera.no_object")}
                </ThemedText>
              ) : (
                detections.map((det, index) => (
                  <View key={index} style={styles.resultItem}>
                    <View style={styles.resultItemLeft}>
                      <Ionicons
                        name="pricetag"
                        size={20}
                        color={theme.colors.primary}
                      />
                      <ThemedText style={styles.labelName}>
                        {det.label}
                      </ThemedText>
                    </View>
                    <ThemedText
                      style={styles.confidenceText}
                      color={theme.colors.primary}
                    >
                      {Math.round(det.confidence * 100)}%
                    </ThemedText>
                  </View>
                ))
              )}
            </ScrollView>

            <View style={styles.resultActions}>
              <AccessibleTouchableOpacity
                style={[
                  styles.actionBtn,
                  { backgroundColor: theme.colors.primary },
                ]}
                onPress={reset}
                accessibilityLabel={t("camera.check_again")}
                accessibilityHint={t("camera.check_again_hint")}
                accessibilityRole="button"
              >
                <Ionicons name="camera" size={24} color="white" />
                <ThemedText style={styles.actionBtnText} color="white">
                  {t("camera.check_again")}
                </ThemedText>
              </AccessibleTouchableOpacity>
            </View>
          </ThemedView>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} facing={facing} ref={cameraRef}>
        {/* Top Controls */}
        <View style={styles.topControls}>
          <View style={styles.smartToggleContainer}>
            <ThemedText style={{ color: "white", fontWeight: "bold" }}>
              Model Pintar
            </ThemedText>
            <Switch
              value={smartMode}
              onValueChange={(val) => {
                haptics.selection();
                setSmartMode(val);
                Speech.stop();
                Speech.speak(val ? "Mode Pintar Aktif" : "Mode Standar Aktif");
              }}
              thumbColor={smartMode ? theme.colors.primary : "#f4f3f4"}
              trackColor={{ false: "#767577", true: "rgba(33, 150, 243, 0.5)" }}
            />
          </View>

          <AccessibleTouchableOpacity
            style={styles.flipBtn}
            onPress={toggleCameraFacing}
            accessibilityLabel={t("camera.flip_camera")}
            accessibilityHint={t("camera.flip_camera")}
            accessibilityRole="button"
          >
            <Ionicons name="camera-reverse" size={28} color="white" />
          </AccessibleTouchableOpacity>
        </View>

        <View style={styles.bottomControls}>
          <AccessibleTouchableOpacity
            style={[styles.captureBtn, smartMode && { borderColor: "#FBC02D" }]}
            onPress={takePicture}
            accessibilityLabel={
              smartMode ? "Ambil foto dan deskripsikan" : t("camera.capture")
            }
            accessibilityHint={t("accessibility.camera_capture")}
            accessibilityRole="button"
          >
            <View
              style={[
                styles.captureInner,
                smartMode && { backgroundColor: "#FBC02D" },
              ]}
            />
          </AccessibleTouchableOpacity>
          <ThemedText style={styles.captureHint} color="white">
            {smartMode
              ? "Ketuk untuk Bertanya pada AI"
              : t("camera.tap_to_detect")}
          </ThemedText>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
    justifyContent: "center",
  },
  message: {
    textAlign: "center",
    paddingBottom: 10,
    color: "white",
  },
  camera: {
    flex: 1,
  },
  preview: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  topControls: {
    position: "absolute",
    top: 50,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 10,
  },
  smartToggleContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 8,
  },
  flipBtn: {
    backgroundColor: "rgba(0,0,0,0.4)",
    padding: 12,
    borderRadius: 30,
  },
  bottomControls: {
    position: "absolute",
    bottom: 60,
    left: 0,
    right: 0,
    alignItems: "center",
    gap: 16,
  },
  captureBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.3)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "white",
  },
  captureInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "white",
  },
  captureHint: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    textShadowColor: "rgba(0,0,0,0.7)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  resultPanel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "70%",
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  resultHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingBottom: 8,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  resultCount: {
    fontSize: 14,
    color: "#666",
  },
  resultList: {
    marginBottom: 20,
    maxHeight: 400,
  },
  descriptionText: {
    fontSize: 18,
    lineHeight: 28,
    color: "#333",
  },
  noResultText: {
    fontSize: 16,
    color: "#888",
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 20,
  },
  resultItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  resultItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  labelName: {
    fontSize: 18,
    fontWeight: "500",
    color: "#333",
    textTransform: "capitalize",
  },
  confidenceText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#2196F3",
  },
  resultActions: {
    marginTop: 10,
  },
  actionBtn: {
    backgroundColor: "#2196F3",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },

  actionBtnText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
});
