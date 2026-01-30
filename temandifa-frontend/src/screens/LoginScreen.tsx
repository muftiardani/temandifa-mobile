import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { AccessibleTouchableOpacity } from "../components/wrappers/AccessibleTouchableOpacity";
import { ThemedText } from "../components/atoms/ThemedText";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../stores/authStore";
import { useNavigation } from "@react-navigation/native";
import { useThemeStore } from "../stores/themeStore";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types/navigation";
import Toast from "react-native-toast-message";
import { AccessibleTextInput } from "../components/molecules/AccessibleTextInput";
import { useTranslation } from "react-i18next";
import { AuthLayout } from "../components/layouts/AuthLayout";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, loginAsGuest, isBiometricEnabled, loginWithBiometrics } =
    useAuthStore();
  const { theme } = useThemeStore();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { t } = useTranslation();

  async function handleLogin() {
    setLoading(true);
    try {
      await login(email, password);
      Toast.show({
        type: "success",
        text1: t("auth.login_success"),
        text2: t("auth.welcome_back"),
      });
    } catch (e: any) {
      // Use Toast for error instead of Alert
      Toast.show({
        type: "error",
        text1: t("auth.login_failed"),
        text2: e.toString(),
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleBiometricLogin() {
    setLoading(true);
    try {
      await loginWithBiometrics();
      Toast.show({
        type: "success",
        text1: t("auth.login_success"),
      });
    } catch {
      Toast.show({
        type: "error",
        text1: t("auth.login_failed"),
        text2: t("auth.biometric_verify_fail"),
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title={t("auth.login")}>
      <AccessibleTextInput
        label={t("auth.email")}
        placeholder="nama@email.com"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        accessibilityHint={t("auth.enter_email")}
      />

      <AccessibleTextInput
        label={t("auth.password")}
        placeholder="******"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        accessibilityHint={t("auth.enter_password")}
      />

      {loading ? (
        <ActivityIndicator size="large" color={theme.colors.primary} />
      ) : (
        <View style={styles.buttonContainer}>
          <AccessibleTouchableOpacity
            style={[styles.button, { backgroundColor: theme.colors.primary }]}
            onPress={handleLogin}
            accessibilityLabel={t("auth.login_btn")}
            accessibilityHint={t("auth.login_btn")}
            accessibilityRole="button"
          >
            <ThemedText style={styles.buttonText} color="white">
              {t("auth.login")}
            </ThemedText>
          </AccessibleTouchableOpacity>

          {isBiometricEnabled && (
            <TouchableOpacity
              style={[styles.bioButton, { borderColor: theme.colors.primary }]}
              onPress={handleBiometricLogin}
              accessibilityLabel={t("auth.login_biometric")}
              accessibilityRole="button"
            >
              <Ionicons
                name="finger-print"
                size={24}
                color={theme.colors.primary}
              />
              <ThemedText style={styles.bioText} color={theme.colors.primary}>
                {t("auth.login_biometric")}
              </ThemedText>
            </TouchableOpacity>
          )}

          <View style={{ marginTop: 10 }}>
            <AccessibleTouchableOpacity
              style={[
                styles.button,
                { backgroundColor: theme.colors.textSecondary },
              ]}
              onPress={loginAsGuest}
              accessibilityLabel={t("auth.login_guest")}
              accessibilityRole="button"
            >
              <ThemedText style={styles.buttonText} color="white">
                {t("auth.login_guest")}
              </ThemedText>
            </AccessibleTouchableOpacity>
          </View>
        </View>
      )}

      <TouchableOpacity
        onPress={() => navigation.navigate("Register" as any)}
        accessibilityRole="link"
        accessibilityLabel={t("auth.no_account")}
      >
        <ThemedText style={styles.link} color={theme.colors.primary}>
          {t("auth.no_account")} {t("auth.register")}
        </ThemedText>
      </TouchableOpacity>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  buttonContainer: {
    marginBottom: 20,
    gap: 10,
    marginTop: 20,
  },
  button: {
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    fontWeight: "bold",
    fontSize: 16,
  },
  bioButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 5,
    gap: 8,
  },
  bioText: {
    fontWeight: "600",
    fontSize: 16,
  },
  link: {
    textAlign: "center",
    marginTop: 10,
  },
});
