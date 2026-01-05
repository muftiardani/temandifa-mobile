import React from "react";
import { View, ActivityIndicator, Text, StyleSheet } from "react-native";

export const LoadingOverlay = () => {
  return (
    <View style={styles.loadingOverlay}>
      <ActivityIndicator size="large" color="#fff" />
      <Text style={styles.text}>Menganalisis...</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    color: "white",
    marginTop: 10,
  },
});
