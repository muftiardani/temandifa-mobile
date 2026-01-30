import { useState, useRef } from "react";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import * as Speech from "expo-speech";
import Toast from "react-native-toast-message";
import { useTranslation } from "react-i18next";

import { Logger } from "../services/logger";
import { detectObject } from "../services/detectionService";
import { askAboutImage } from "../services/vqaService";
import { saveHistory } from "../services/historyService";
import { DetectionItem } from "../schemas/detection";
import { haptics } from "../utils/haptics";
import { optimizeImageForDetection, optimizeImage } from "../utils/imageUtils";

export function useCameraLogic() {
  const [facing, setFacing] = useState<CameraType>("back");
  const [permission, requestPermission] = useCameraPermissions();
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [detections, setDetections] = useState<DetectionItem[]>([]);
  const [smartMode, setSmartMode] = useState(false);
  const [smartDescription, setSmartDescription] = useState<string | null>(null);

  const { t } = useTranslation();
  const cameraRef = useRef<CameraView>(null);

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
        const optimizedUri = await optimizeImage(uri, {
          maxWidth: 1024,
          quality: 0.7,
        });

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
          } catch {}
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
            } catch {}
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

  function toggleSmartMode(value: boolean) {
    haptics.selection();
    setSmartMode(value);
    Speech.stop();
    Speech.speak(value ? "Mode Pintar Aktif" : "Mode Standar Aktif");
  }

  return {
    cameraRef,
    facing,
    permission,
    requestPermission,
    image,
    loading,
    detections,
    smartMode,
    smartDescription,
    takePicture,
    reset,
    toggleCameraFacing,
    toggleSmartMode,
  };
}
