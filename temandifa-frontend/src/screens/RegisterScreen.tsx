import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { AccessibleTouchableOpacity } from "../components/wrappers/AccessibleTouchableOpacity";
import { ThemedText } from "../components/atoms/ThemedText";
import { register as registerApi } from "../services/authService";
import { useNavigation } from "@react-navigation/native";
import { useThemeStore } from "../stores/themeStore";
import Toast from "react-native-toast-message";

import { AccessibleTextInput } from "../components/molecules/AccessibleTextInput";
import { useTranslation } from "react-i18next";
import { AuthLayout } from "../components/layouts/AuthLayout";

export default function RegisterScreen() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();
  const { theme } = useThemeStore();
  const { t } = useTranslation();

  async function handleRegister() {
    setLoading(true);
    try {
      await registerApi(fullName, email, password);
      Toast.show({
        type: "success",
        text1: t("auth.register_success"),
        text2: t("auth.register_success_desc"),
      });
      navigation.goBack();
    } catch (e: any) {
      Toast.show({
        type: "error",
        text1: t("auth.register_failed"),
        text2: e.toString(),
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title={t("auth.register")}>
      <AccessibleTextInput
        label={t("auth.full_name")}
        placeholder="John Doe"
        value={fullName}
        onChangeText={setFullName}
        accessibilityHint={t("auth.enter_fullname")}
      />

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
        accessibilityHint={t("auth.enter_new_password")}
      />

      {loading ? (
        <ActivityIndicator size="large" color={theme.colors.primary} />
      ) : (
        <View style={styles.buttonContainer}>
          <AccessibleTouchableOpacity
            style={[styles.button, { backgroundColor: theme.colors.primary }]}
            onPress={handleRegister}
            accessibilityLabel={t("auth.register_btn")}
            accessibilityHint={t("auth.register_btn")}
            accessibilityRole="button"
          >
            <ThemedText style={styles.buttonText} color="white">
              {t("auth.register")}
            </ThemedText>
          </AccessibleTouchableOpacity>
        </View>
      )}

      <TouchableOpacity
        onPress={() => navigation.goBack()}
        accessibilityRole="link"
        accessibilityLabel={t("auth.has_account")}
      >
        <ThemedText style={styles.link} color={theme.colors.primary}>
          {t("auth.has_account")} {t("auth.login")}
        </ThemedText>
      </TouchableOpacity>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  buttonContainer: {
    marginBottom: 20,
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
  link: {
    textAlign: "center",
    marginTop: 10,
  },
});
