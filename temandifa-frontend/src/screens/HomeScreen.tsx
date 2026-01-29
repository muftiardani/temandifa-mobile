import React from "react";
import { View, StyleSheet, ScrollView, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useThemeStore } from "../stores/themeStore";
import { RootStackParamList } from "../types/navigation";
import { ThemedText } from "../components/atoms/ThemedText";

import { AccessibleTouchableOpacity } from "../components/wrappers/AccessibleTouchableOpacity";
import { FeatureCard } from "../components/molecules/FeatureCard";
import { useScreenReaderFocus } from "../hooks/useScreenReaderFocus";

type HomeScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "Home"
>;

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { t } = useTranslation();
  const { theme } = useThemeStore();
  const focusRef = useScreenReaderFocus();

  const handleEmergency = () => {
    Alert.alert(
      t("common.error"),
      "Fitur panggilan darurat akan segera hadir di sini."
    );
  };

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <ThemedText variant="title" ref={focusRef}>
            {t("greeting.welcome")}
          </ThemedText>
          <ThemedText variant="subtitle" style={{ marginTop: 8 }}>
            {t("greeting.ask_help")}
          </ThemedText>
        </View>

        <View style={styles.grid}>
          <FeatureCard
            title={t("menu.camera_obj")}
            icon="camera"
            color={theme.colors.featureCamera}
            onPress={() => navigation.navigate("Camera")}
            fullWidth
            accessibilityHint="Membuka kamera untuk mendeteksi objek di sekitar"
          />

          <View style={styles.row}>
            <FeatureCard
              title={t("menu.scan")}
              icon="scan"
              color={theme.colors.featureScan}
              onPress={() => navigation.navigate("Scan")}
              accessibilityHint="Membuka menu pemindaian dokumen"
            />

            <FeatureCard
              title={t("menu.voice")}
              icon="mic"
              color={theme.colors.featureVoice}
              onPress={() => navigation.navigate("Voice")}
              accessibilityHint="Membuka fitur perintah suara dan transkripsi"
            />
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.pillDock}>
          <AccessibleTouchableOpacity
            style={styles.dockBtn}
            onPress={() => navigation.navigate("Profile")}
            accessibilityLabel="Profil Saya"
            accessibilityHint="Membuka halaman profil pengguna"
          >
            <Ionicons name="person" size={24} color="white" />
          </AccessibleTouchableOpacity>

          <View style={styles.dockDivider} />

          <AccessibleTouchableOpacity
            style={styles.dockBtn}
            onPress={() => navigation.navigate("Settings")}
            accessibilityLabel="Pengaturan"
            accessibilityHint="Membuka halaman pengaturan aplikasi"
          >
            <Ionicons name="settings-sharp" size={24} color="white" />
          </AccessibleTouchableOpacity>
        </View>

        <AccessibleTouchableOpacity
          style={styles.emergencyBtn}
          onPress={handleEmergency}
          accessibilityLabel="Tombol Darurat"
          accessibilityHint="Panggilan darurat"
        >
          <Ionicons name="call" size={28} color="white" />
        </AccessibleTouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 60,
  },
  header: {
    marginBottom: 30,
  },
  greeting: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subGreeting: {
    fontSize: 16,
    lineHeight: 24,
  },
  grid: {
    gap: 16,
  },
  row: {
    flexDirection: "row",
    gap: 16,
  },
  footer: {
    position: "absolute",
    bottom: 40,
    left: 24,
    right: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pillDock: {
    flexDirection: "row",
    backgroundColor: "#1a1a1a",
    borderRadius: 30,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: "center",
    gap: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  dockBtn: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 22,
  },
  dockDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#444",
    marginHorizontal: 4,
  },
  emergencyBtn: {
    backgroundColor: "#D93025",
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#D93025",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
