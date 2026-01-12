import React from "react";
import {
  View,
  StyleSheet,
  Alert,
  Switch,
  Modal,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAuthStore } from "../stores/authStore";
import { Ionicons } from "@expo/vector-icons";
import { useThemeStore } from "../stores/themeStore";
import { ThemedText } from "../components/atoms/ThemedText";
import { ThemedView } from "../components/atoms/ThemedView";
import { AccessibleTouchableOpacity } from "../components/wrappers/AccessibleTouchableOpacity";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types/navigation";
import { useTranslation } from "react-i18next";

export default function ProfileScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {
    user,
    logout,
    isBiometricEnabled,
    enableBiometrics,
    disableBiometrics,
  } = useAuthStore();
  const { theme } = useThemeStore();
  const { t } = useTranslation();
  const [modalVisible, setModalVisible] = React.useState(false);
  const [passwordConfirm, setPasswordConfirm] = React.useState("");

  const handleLogout = () => {
    Alert.alert(t("auth.logout_title"), t("auth.logout_confirm"), [
      { text: t("auth.cancel_btn"), style: "cancel" },
      { text: t("auth.logout_btn"), style: "destructive", onPress: logout },
    ]);
  };

  const toggleBiometric = async () => {
    if (isBiometricEnabled) {
      // Disable
      await disableBiometrics();
      Alert.alert(t("common.success"), t("auth.biometric_success"));
    } else {
      // Enable -> Show Modal
      setPasswordConfirm("");
      setModalVisible(true);
    }
  };

  const confirmEnableBiometric = async () => {
    if (!passwordConfirm) {
      Alert.alert(t("common.error"), t("auth.password_empty"));
      return;
    }
    try {
      await enableBiometrics(passwordConfirm);
      Alert.alert(t("common.success"), t("auth.biometric_enable_success"));
      setModalVisible(false);
    } catch {
      Alert.alert(t("common.error"), t("auth.biometric_fail"));
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedView
        variant="surface"
        style={[styles.header, { borderBottomColor: theme.colors.border }]}
      >
        <View style={styles.avatarContainer}>
          <View
            style={[
              styles.avatarPlaceholder,
              { backgroundColor: theme.colors.primary },
            ]}
          >
            <ThemedText style={styles.avatarText} color="white">
              {user?.full_name ? user.full_name.charAt(0).toUpperCase() : "U"}
            </ThemedText>
          </View>
        </View>
        <ThemedText variant="title" style={styles.name}>
          {user?.full_name || "Pengguna"}
        </ThemedText>
        <ThemedText variant="subtitle" style={styles.email}>
          {user?.email || "email@example.com"}
        </ThemedText>
      </ThemedView>

      <View style={styles.infoSection}>
        <ThemedView variant="surface" style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons
              name="mail"
              size={20}
              color={theme.colors.textSecondary}
            />
            <ThemedText style={styles.infoText}>{user?.email}</ThemedText>
          </View>
          <View
            style={[styles.divider, { backgroundColor: theme.colors.border }]}
          />
          <View style={styles.infoRow}>
            <Ionicons
              name="calendar"
              size={20}
              color={theme.colors.textSecondary}
            />
            <ThemedText style={styles.infoText}>
              {t("auth.join_date", { year: 2024 })}
            </ThemedText>
          </View>
        </ThemedView>

        <ThemedView
          variant="surface"
          style={[
            styles.menuItem,
            { backgroundColor: theme.colors.surface, marginTop: 16 },
          ]}
        >
          <View style={styles.menuLeft}>
            <Ionicons
              name="finger-print"
              size={24}
              color={theme.colors.primary}
            />
            <View>
              <ThemedText style={styles.menuText}>
                {t("auth.biometric_login_opt")}
              </ThemedText>
              <ThemedText variant="caption" color={theme.colors.textSecondary}>
                {isBiometricEnabled ? t("auth.active") : t("auth.inactive")}
              </ThemedText>
            </View>
          </View>
          <Switch
            value={isBiometricEnabled}
            onValueChange={toggleBiometric}
            trackColor={{ false: "#767577", true: theme.colors.primary }}
          />
        </ThemedView>

        <AccessibleTouchableOpacity
          style={[styles.menuItem, { backgroundColor: theme.colors.surface }]}
          onPress={() => navigation.navigate("History")}
          accessibilityLabel="Lihat Riwayat"
          accessibilityHint="Membuka halaman riwayat aktivitas deteksi dan OCR"
          accessibilityRole="button"
        >
          <View style={styles.menuLeft}>
            <Ionicons name="time" size={24} color={theme.colors.primary} />
            <ThemedText style={styles.menuText}>
              {t("auth.activity_history")}
            </ThemedText>
          </View>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={theme.colors.textSecondary}
          />
        </AccessibleTouchableOpacity>
      </View>

      <AccessibleTouchableOpacity
        style={[
          styles.logoutButton,
          {
            backgroundColor: theme.colors.error + "1A",
            borderColor: theme.colors.error,
          },
        ]} // 10% opacity
        onPress={handleLogout}
        accessibilityLabel={t("auth.sign_out")}
        accessibilityHint="Menekan tombol ini akan  keluar dari akun Anda"
        accessibilityRole="button"
      >
        <Ionicons name="log-out-outline" size={24} color={theme.colors.error} />
        <ThemedText style={styles.logoutText} color={theme.colors.error}>
          {t("auth.sign_out")}
        </ThemedText>
      </AccessibleTouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalView,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <ThemedText variant="title" style={{ marginBottom: 10 }}>
              {t("auth.confirm_password_title")}
            </ThemedText>
            <ThemedText style={{ marginBottom: 20 }}>
              {t("auth.confirm_password_desc")}
            </ThemedText>

            <TextInput
              style={[
                styles.modalInput,
                { borderColor: theme.colors.border, color: theme.colors.text },
              ]}
              placeholder={t("auth.password")}
              placeholderTextColor={theme.colors.textSecondary}
              secureTextEntry
              value={passwordConfirm}
              onChangeText={setPasswordConfirm}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.modalBtnCancel}
              >
                <ThemedText color={theme.colors.error}>
                  {t("auth.cancel_btn")}
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmEnableBiometric}
                style={[
                  styles.modalBtnConfirm,
                  { backgroundColor: theme.colors.primary },
                ]}
              >
                <ThemedText color="white">{t("auth.activate")}</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: "center",
    paddingVertical: 40,
    borderBottomWidth: 1,
  },
  avatarContainer: {
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "white",
  },
  avatarText: {
    fontSize: 40,
    fontWeight: "bold",
  },
  name: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
  },
  infoSection: {
    padding: 20,
  },
  infoCard: {
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
  },
  infoText: {
    fontSize: 16,
  },
  divider: {
    height: 1,
    opacity: 0.5,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 20,
    // backgroundColor handled inline
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    // borderColor handled inline
  },
  logoutText: {
    fontWeight: "bold",
    fontSize: 16,
  },
  menuItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  menuLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  menuText: {
    fontSize: 16,
    fontWeight: "500",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalView: {
    width: "80%",
    padding: 24,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalInput: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    fontSize: 16,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    width: "100%",
    gap: 16,
    alignItems: "center",
  },
  modalBtnCancel: {
    padding: 10,
  },
  modalBtnConfirm: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
});
