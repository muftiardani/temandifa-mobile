import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  SafeAreaView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Speech from "expo-speech";
import { useTranslation } from "react-i18next";

import { scanText } from "../services/ocrService";
import { RootStackParamList } from "../types/navigation";
import { LoadingOverlay } from "../components/LoadingOverlay";
import { useTheme } from "../context/ThemeContext";

type ScanScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "Scan"
>;

export default function ScanScreen() {
  const navigation = useNavigation<ScanScreenNavigationProp>();
  const { t } = useTranslation();
  const { theme } = useTheme();

  const [loading, setLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Navigasi ke Layar Kamera Khusus Dokumen
  const handleCamera = () => {
    navigation.navigate("DocumentScanner");
  };

  // Logika Upload Galeri
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
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        setSelectedImage(uri);
        processImage(uri);
      }
    } catch (error) {
      console.error("Pick Image Error:", error);
      Alert.alert(t("common.error"), t("scan.error_gallery"));
    }
  };

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
      console.error("OCR Error:", error);
      Alert.alert(t("common.error"), t("scan.error_process"));
      Speech.speak(t("scan.failed"));
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setOcrResult(null);
    setSelectedImage(null);
    Speech.stop();
  };

  // Tampilan Hasil Scan (Preview & Teks)
  if (selectedImage && ocrResult !== null) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <View
          style={[
            styles.resultHeader,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            {t("scan.result_title")}
          </Text>
        </View>

        <Image
          source={{ uri: selectedImage }}
          style={styles.previewImage}
          resizeMode="contain"
        />

        <View
          style={[styles.textArea, { backgroundColor: theme.colors.surface }]}
        >
          <Text
            style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}
          >
            {t("scan.result_text")}
          </Text>
          <ScrollView style={styles.resultScroll}>
            <Text style={[styles.resultText, { color: theme.colors.text }]}>
              {ocrResult}
            </Text>
          </ScrollView>
        </View>

        <View
          style={[
            styles.resultFooter,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: theme.colors.primary },
            ]}
            onPress={() => Speech.speak(ocrResult || "")}
          >
            <Ionicons name="volume-high" size={24} color="white" />
            <Text style={styles.actionText}>{t("scan.read")}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.secondaryButton,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.border,
              },
            ]}
            onPress={reset}
          >
            <Ionicons name="refresh" size={24} color={theme.colors.text} />
            <Text style={[styles.actionText, { color: theme.colors.text }]}>
              {t("scan.retry")}
            </Text>
          </TouchableOpacity>
        </View>

        {loading && <LoadingOverlay />}
      </SafeAreaView>
    );
  }

  // Tampilan Menu Utama Scan
  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.menuContainer}>
        <Text style={[styles.menuHeader, { color: theme.colors.text }]}>
          {t("scan.method_title")}
        </Text>

        {/* Button Kamera */}
        <TouchableOpacity
          style={[styles.menuCard, styles.cardCamera]}
          onPress={handleCamera}
        >
          <View style={styles.iconCircle}>
            <Ionicons name="camera" size={40} color="#EA4335" />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>{t("menu.camera")}</Text>
            <Text style={styles.cardSubtitle}>{t("scan.camera_desc")}</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="white" />
        </TouchableOpacity>

        {/* Button Upload */}
        <TouchableOpacity
          style={[styles.menuCard, styles.cardUpload]}
          onPress={handleUpload}
        >
          <View style={styles.iconCircle}>
            <Ionicons name="images" size={40} color="#00BFA5" />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>{t("menu.gallery")}</Text>
            <Text style={styles.cardSubtitle}>{t("scan.gallery_desc")}</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="white" />
        </TouchableOpacity>
      </View>
      {loading && <LoadingOverlay />}
    </View>
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
    backgroundColor: "#EA4335", // Red/Orange
  },
  cardUpload: {
    backgroundColor: "#00BFA5", // Teal/Cyan
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
  // Result Styles
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
    backgroundColor: "#333",
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
    backgroundColor: "#2196F3",
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
