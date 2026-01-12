import { useState } from "react";
import { Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as Speech from "expo-speech";
import { useTranslation } from "react-i18next";

import { scanText } from "../services/ocrService";
import { optimizeImageForOCR } from "../utils/imageUtils";
import { Logger } from "../services/logger";

interface OCRScanResult {
  loading: boolean;
  ocrResult: string | null;
  selectedImage: string | null;
  handleUpload: () => Promise<void>;
  processImage: (uri: string) => Promise<void>;
  reset: () => void;
  speak: () => void;
}

export function useOCRScan(): OCRScanResult {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const processImage = async (uri: string) => {
    setLoading(true);
    setOcrResult(null);
    try {
      const response = await scanText(uri);
      if (response.data) {
        const text = response.data.full_text;
        if (text) {
          setOcrResult(text);
          Speech.speak(t("scan.text_found") + " " + text);
        } else {
          setOcrResult(t("scan.no_text"));
          Speech.speak(t("scan.no_text"));
        }
      }
    } catch (error) {
      Logger.error("useOCRScan", "OCR Error:", error);
      Alert.alert(t("common.error"), t("scan.error_process"));
      Speech.speak(t("scan.failed"));
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== "granted") {
      Alert.alert(
        t("permissions.required_title"),
        t("permissions.gallery_required")
      );
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false, // Don't allow editing to keep full quality/context
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        // Optimize before displaying/processing
        const optimizedUri = await optimizeImageForOCR(uri);

        setSelectedImage(optimizedUri);
        processImage(optimizedUri);
      }
    } catch (error) {
      Logger.error("useOCRScan", "Pick Image Error:", error);
      Alert.alert(t("common.error"), t("scan.error_gallery"));
    }
  };

  const reset = () => {
    setOcrResult(null);
    setSelectedImage(null);
    Speech.stop();
  };

  const speak = () => {
    if (ocrResult) {
      Speech.speak(ocrResult);
    }
  };

  return {
    loading,
    ocrResult,
    selectedImage,
    handleUpload,
    processImage,
    reset,
    speak,
  };
}
