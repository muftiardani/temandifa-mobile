import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import { useState, useRef } from "react";
import {
  Button,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import * as Speech from "expo-speech";
import { Ionicons } from "@expo/vector-icons";

import { scanText } from "../services/ocrService";
import { LoadingOverlay } from "../components/LoadingOverlay";

export default function DocumentScannerScreen() {
  const [facing, setFacing] = useState<CameraType>("back");
  const [permission, requestPermission] = useCameraPermissions();
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // OCR Result
  const [ocrText, setOcrText] = useState<string>("");

  const cameraRef = useRef<CameraView>(null);

  if (!permission) {
    // Permission Status Loading
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>
          Akses kamera diperlukan untuk memindai dokumen.
        </Text>
        <Button onPress={requestPermission} title="Izinkan Akses Kamera" />
      </View>
    );
  }

  async function takePicture() {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.7, // Slightly higher quality for text
          base64: false,
        });
        if (photo) {
          setImage(photo.uri);
          processImage(photo.uri);
        }
      } catch (e) {
        console.error("Camera Error:", e);
        Alert.alert("Error", "Gagal mengambil foto.");
      }
    }
  }

  async function processImage(uri: string) {
    setLoading(true);
    setOcrText("");
    try {
      const response = await scanText(uri);
      if (response.data) {
        const text = response.data.full_text;
        if (text) {
          setOcrText(text);
          Speech.speak("Teks ditemukan. " + text);
        } else {
          setOcrText("Teks tidak terbaca dengan jelas.");
          Speech.speak("Maaf, teks tidak terbaca.");
        }
      }
    } catch (error) {
      console.error("OCR Service Error:", error);
      Alert.alert("Gagal", "Koneksi ke server gagal atau terjadi kesalahan.");
      Speech.speak("Gagal memproses gambar.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setImage(null);
    setOcrText("");
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
          <View style={styles.resultPanel}>
            <View style={styles.resultHeader}>
              <Text style={styles.resultTitle}>Hasil Deteksi Teks</Text>
            </View>

            <View style={styles.resultContent}>
              <Text style={styles.ocrText}>{ocrText || "..."}</Text>
            </View>

            <View style={styles.resultActions}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => Speech.speak(ocrText)}
              >
                <Ionicons name="volume-high" size={24} color="white" />
                <Text style={styles.actionBtnText}>Baca</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.secondaryBtn]}
                onPress={reset}
              >
                <Ionicons name="camera-outline" size={24} color="#333" />
                <Text style={[styles.actionBtnText, { color: "#333" }]}>
                  Foto Ulang
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} facing={facing} ref={cameraRef}>
        {/* Flip Camera Button */}
        <TouchableOpacity style={styles.flipBtn} onPress={toggleCameraFacing}>
          <Ionicons name="camera-reverse" size={28} color="white" />
        </TouchableOpacity>

        {/* Capture Button */}
        <View style={styles.bottomControls}>
          <TouchableOpacity style={styles.captureBtn} onPress={takePicture}>
            <View style={styles.captureInner} />
          </TouchableOpacity>
          <Text style={styles.captureHint}>Ketuk untuk Memindai</Text>
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
    color: "#333",
  },
  resultContent: {
    marginBottom: 24,
    maxHeight: 200,
  },
  ocrText: {
    fontSize: 18,
    lineHeight: 28,
    color: "#444",
  },
  resultActions: {
    flexDirection: "row",
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: "#2196F3",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  secondaryBtn: {
    backgroundColor: "#f5f5f5",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  actionBtnText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
});
