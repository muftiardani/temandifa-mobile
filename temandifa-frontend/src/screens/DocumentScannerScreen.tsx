import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import { useState, useRef } from "react";
import {
  Button,
  StyleSheet,
  View,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import * as Speech from "expo-speech";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useThemeStore } from "../stores/themeStore";
import { ThemedText } from "../components/atoms/ThemedText";
import { ThemedView } from "../components/atoms/ThemedView";
import { AccessibleTouchableOpacity } from "../components/wrappers/AccessibleTouchableOpacity";

import { scanText } from "../services/ocrService";
import { LoadingOverlay } from "../components/molecules/LoadingOverlay";
import { Logger } from "../services/logger";
import { optimizeImageForOCR } from "../utils/imageUtils";
import { useOCRScan } from "../hooks/useOCRScan";

export default function DocumentScannerScreen() {
  const [facing, setFacing] = useState<CameraType>("back");
  const [permission, requestPermission] = useCameraPermissions();
  // We keep local image state for the preview, as the hook's selectedImage is for the gallery picker
  const [image, setImage] = useState<string | null>(null);

  const { t } = useTranslation();
  const { theme } = useThemeStore();

  const { loading, ocrResult, processImage, reset: resetHook } = useOCRScan();

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
        <ThemedText style={styles.message}>
          {t("document_scanner.permission_msg")}
        </ThemedText>
        <Button
          onPress={requestPermission}
          title={t("document_scanner.permission_grant")}
        />
      </View>
    );
  }

  async function takePicture() {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.7,
          base64: false,
        });
        if (photo) {
          const optimizedUri = await optimizeImageForOCR(photo.uri);
          setImage(optimizedUri);
          await processImage(optimizedUri);
        }
      } catch (e) {
        Logger.error("DocumentScanner", "Camera Error:", e);
        Alert.alert(t("common.error"), t("document_scanner.error_capture"));
      }
    }
  }

  function reset() {
    setImage(null);
    resetHook();
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
            <View
              style={[
                styles.resultHeader,
                { borderBottomColor: theme.colors.border },
              ]}
            >
              <ThemedText variant="title" style={styles.resultTitle}>
                {t("document_scanner.result_title")}
              </ThemedText>
            </View>

            <View style={styles.resultContent}>
              <ThemedText style={styles.ocrText}>
                {ocrResult || "..."}
              </ThemedText>
            </View>

            <View style={styles.resultActions}>
              <AccessibleTouchableOpacity
                style={[
                  styles.actionBtn,
                  { backgroundColor: theme.colors.primary },
                ]}
                onPress={() =>
                  requestAnimationFrame(() => Speech.speak(ocrResult || ""))
                }
                accessibilityLabel={t("document_scanner.read")}
                accessibilityRole="button"
              >
                <Ionicons name="volume-high" size={24} color="white" />
                <ThemedText style={styles.actionBtnText}>
                  {t("document_scanner.read")}
                </ThemedText>
              </AccessibleTouchableOpacity>
              <AccessibleTouchableOpacity
                style={[
                  styles.actionBtn,
                  {
                    backgroundColor: theme.colors.surface,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                  },
                ]}
                onPress={reset}
                accessibilityLabel={t("document_scanner.retake")}
                accessibilityRole="button"
              >
                <Ionicons
                  name="camera-outline"
                  size={24}
                  color={theme.colors.text}
                />
                <ThemedText
                  style={[styles.actionBtnText, { color: theme.colors.text }]}
                >
                  {t("document_scanner.retake")}
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
        <AccessibleTouchableOpacity
          style={styles.flipBtn}
          onPress={toggleCameraFacing}
          accessibilityLabel="Flip Camera"
          accessibilityRole="button"
        >
          <Ionicons name="camera-reverse" size={28} color="white" />
        </AccessibleTouchableOpacity>

        <View style={styles.bottomControls}>
          <AccessibleTouchableOpacity
            style={styles.captureBtn}
            onPress={takePicture}
            accessibilityLabel="Capture"
            accessibilityRole="button"
          >
            <View style={styles.captureInner} />
          </AccessibleTouchableOpacity>
          <ThemedText style={styles.captureHint} color="white">
            {t("document_scanner.tap_hint")}
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
    // color: "white", // Handled by ThemedText
  },
  camera: {
    flex: 1,
  },
  preview: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  flipBtn: {
    position: "absolute",
    top: 50,
    right: 20,
    backgroundColor: "rgba(0,0,0,0.4)",
    padding: 12,
    borderRadius: 30,
    zIndex: 10,
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
  // Result Panel Styles
  resultPanel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "60%",
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  resultHeader: {
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingBottom: 8,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  resultContent: {
    marginBottom: 24,
    maxHeight: 200,
  },
  ocrText: {
    fontSize: 18,
    lineHeight: 28,
  },
  resultActions: {
    flexDirection: "row",
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    // backgroundColor: "#2196F3", // Handled inline
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  secondaryBtn: {
    // backgroundColor: "#f5f5f5", // Handled inline
    borderWidth: 1,
    // borderColor: "#ddd", // Handled inline
  },
  actionBtnText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
});
