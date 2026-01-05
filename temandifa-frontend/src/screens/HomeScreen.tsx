import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "../context/ThemeContext";
import { RootStackParamList } from "../types/navigation";

type HomeScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "Home"
>;

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { t } = useTranslation();
  const { theme } = useTheme();

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
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.greeting, { color: theme.colors.text }]}>
            {t("greeting.welcome")}
          </Text>
          <Text
            style={[styles.subGreeting, { color: theme.colors.textSecondary }]}
          >
            {t("greeting.ask_help")}
          </Text>
        </View>

        {/* Main Feature Cards */}
        <View style={styles.grid}>
          {/* Kamera Card (Full Width) - Deteksi Objek */}
          <TouchableOpacity
            style={[styles.card, styles.cardBlue, styles.cardFull]}
            onPress={() => navigation.navigate("Camera")}
          >
            <Ionicons name="camera" size={32} color="white" />
            <Text style={styles.cardText}>{t("menu.camera_obj")}</Text>
          </TouchableOpacity>

          <View style={styles.row}>
            {/* Scan Card - Menu Scan/Upload */}
            <TouchableOpacity
              style={[styles.card, styles.cardOrange]}
              onPress={() => navigation.navigate("Scan")}
            >
              <Ionicons name="scan" size={32} color="white" />
              <Text style={styles.cardText}>{t("menu.scan")}</Text>
            </TouchableOpacity>

            {/* Voice Card */}
            <TouchableOpacity
              style={[styles.card, styles.cardTeal]}
              onPress={() => navigation.navigate("Voice")}
            >
              <Ionicons name="mic" size={32} color="white" />
              <Text style={styles.cardText}>{t("menu.voice")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Floating Footer */}
      <View style={styles.footer}>
        {/* Dock: Settings & Profile (Pill Shape) */}
        <View style={styles.pillDock}>
          <TouchableOpacity
            style={styles.dockBtn}
            onPress={() => navigation.navigate("Profile")}
          >
            <Ionicons name="person" size={24} color="white" />
          </TouchableOpacity>

          <View style={styles.dockDivider} />

          <TouchableOpacity
            style={styles.dockBtn}
            onPress={() => navigation.navigate("Settings")}
          >
            <Ionicons name="settings-sharp" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Emergency Button */}
        <TouchableOpacity style={styles.emergencyBtn} onPress={handleEmergency}>
          <Ionicons name="call" size={28} color="white" />
        </TouchableOpacity>
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
  card: {
    borderRadius: 20,
    padding: 24,
    justifyContent: "center",
    alignItems: "flex-start",
    height: 160,
    flex: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  cardFull: {
    width: "100%",
  },
  cardBlue: {
    backgroundColor: "#4285F4",
  },
  cardOrange: {
    backgroundColor: "#EA4335", // Reddish Orange
  },
  cardTeal: {
    backgroundColor: "#00BFA5",
  },
  cardText: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 12,
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
    backgroundColor: "#1a1a1a", // Black/Dark Grey
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
