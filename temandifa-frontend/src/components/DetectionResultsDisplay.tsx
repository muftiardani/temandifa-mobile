import React from "react";
import { View, Text, StyleSheet, Button } from "react-native";
import { DetectionResult } from "../types/detection";

interface DetectionResultsDisplayProps {
  results: DetectionResult[];
  onReset: () => void;
}

export const DetectionResultsDisplay = ({
  results,
  onReset,
}: DetectionResultsDisplayProps) => {
  return (
    <View style={styles.resultContainer}>
      <Text style={styles.resultTitle}>Hasil Deteksi:</Text>
      {results.length === 0 ? (
        <Text>Tidak ada objek terdeteksi</Text>
      ) : (
        results.map((det, idx) => (
          <Text key={idx} style={styles.resultItem}>
            {det.label} ({Math.round(det.confidence * 100)}%)
          </Text>
        ))
      )}
      <Button title="Ambil Foto Lagi" onPress={onReset} />
    </View>
  );
};

const styles = StyleSheet.create({
  resultContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "white",
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  resultItem: {
    fontSize: 16,
    marginBottom: 5,
  },
});
