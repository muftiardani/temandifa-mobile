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
  ScrollView,
} from "react-native";
import * as Speech from "expo-speech";
import { Ionicons } from "@expo/vector-icons";

import { detectObject } from "../services/detectionService";
import { LoadingOverlay } from "../components/LoadingOverlay";
import { DetectionResult } from "../types/detection";

export default function CameraScreen() {
  const [facing, setFacing] = useState<CameraType>("back");
  const [permission, requestPermission] = useCameraPermissions();
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [detections, setDetections] = useState<DetectionResult[]>([]);

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
      <View style={styles.container}>
        <Text style={styles.message}>
          Akses kamera diperlukan untuk mendeteksi objek.
        </Text>
        <Button onPress={requestPermission} title="Izinkan Akses Kamera" />
      </View>
    );
  }

  async function takePicture() {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.5,
          base64: false,
        });
        if (photo) {
          setImage(photo.uri);
          processImage(photo.uri);
        }
      } catch (e) {
        console.error(e);
        Alert.alert("Error", "Gagal mengambil foto.");
      }
    }
  }

  async function processImage(uri: string) {
    setLoading(true);
    setDetections([]);
    try {
      const response = await detectObject(uri);
      if (response.data) {
        setDetections(response.data);
        // Speak summary
        const labels = response.data.map((d) => d.label).join(", ");
        if (labels) {
          Speech.speak("Terdeteksi: " + labels);
        } else {
          Speech.speak("Tidak ada objek terdeteksi");
        }
      }
    } catch (error) {
      console.error(error);
      Speech.speak("Gagal mendeteksi objek");
      Alert.alert("Error", "Gagal mendeteksi objek.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setImage(null);
    setDetections([]);
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
              <Text style={styles.resultTitle}>Hasil Deteksi Objek</Text>
              <Text style={styles.resultCount}>
                {detections.length} Objek Ditemukan
              </Text>
            </View>

            <ScrollView style={styles.resultList}>
              {detections.length === 0 ? (
                <Text style={styles.noResultText}>
                  Tidak ada objek yang dikenali.
                </Text>
              ) : (
                detections.map((det, index) => (
                  <View key={index} style={styles.resultItem}>
                    <View style={styles.resultItemLeft}>
                      <Ionicons name="pricetag" size={20} color="#2196F3" />
                      <Text style={styles.labelName}>{det.label}</Text>
                    </View>
                    <Text style={styles.confidenceText}>
                      {Math.round(det.confidence * 100)}%
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>

            <View style={styles.resultActions}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.secondaryBtn]}
                onPress={reset}
              >
                <Ionicons name="camera" size={24} color="white" />
                <Text style={styles.actionBtnText}>Cek Lagi</Text>
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

        <View style={styles.bottomControls}>
          <TouchableOpacity style={styles.captureBtn} onPress={takePicture}>
            <View style={styles.captureInner} />
          </TouchableOpacity>
          <Text style={styles.captureHint}>Ketuk untuk Deteksi</Text>
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
  // Result Panel
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
    maxHeight: 200,
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
  secondaryBtn: {
    backgroundColor: "#2196F3", // Keep it main action color for re-taking
  },
  actionBtnText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
});
