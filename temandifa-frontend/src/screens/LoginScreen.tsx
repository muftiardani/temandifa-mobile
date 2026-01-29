import React, { useState } from "react";
import {
  View,
  Text,
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

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, loginAsGuest, isBiometricEnabled, loginWithBiometrics } =
    useAuthStore();
  const { theme } = useThemeStore();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  async function handleLogin() {
    setLoading(true);
    try {
      await login(email, password);
      Toast.show({
        type: "success",
        text1: "Login Berhasil",
        text2: "Selamat datang kembali!",
      });
    } catch (e: any) {
      // Use Toast for error instead of Alert
      Toast.show({
        type: "error",
        text1: "Login Gagal",
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
        text1: "Login Biometrik Berhasil",
      });
    } catch {
      Toast.show({
        type: "error",
        text1: "Login Gagal",
        text2: "Verifikasi biometrik gagal atau dibatalkan.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Text style={[styles.title, { color: theme.colors.text }]}>Masuk</Text>

      <AccessibleTextInput
        label="Email"
        placeholder="nama@email.com"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        accessibilityHint="Masukkan alamat email anda"
      />

      <AccessibleTextInput
        label="Password"
        placeholder="******"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        accessibilityHint="Masukkan kata sandi anda"
      />

      {loading ? (
        <ActivityIndicator size="large" color={theme.colors.primary} />
      ) : (
        <View style={styles.buttonContainer}>
          <AccessibleTouchableOpacity
            style={[styles.button, { backgroundColor: theme.colors.primary }]}
            onPress={handleLogin}
            accessibilityLabel="Tombol Masuk"
            accessibilityHint="Menekan tombol ini akan memproses login"
            accessibilityRole="button"
          >
            <ThemedText style={styles.buttonText}>Masuk</ThemedText>
          </AccessibleTouchableOpacity>

          {isBiometricEnabled && (
            <TouchableOpacity
              style={[styles.bioButton, { borderColor: theme.colors.primary }]}
              onPress={handleBiometricLogin}
              accessibilityLabel="Login dengan Biometrik"
              accessibilityRole="button"
            >
              <Ionicons
                name="finger-print"
                size={24}
                color={theme.colors.primary}
              />
              <Text style={[styles.bioText, { color: theme.colors.primary }]}>
                Login dengan Biometrik
              </Text>
            </TouchableOpacity>
          )}

          <View style={{ marginTop: 10 }}>
            <AccessibleTouchableOpacity
              style={[
                styles.button,
                { backgroundColor: theme.colors.textSecondary },
              ]}
              onPress={loginAsGuest}
              accessibilityLabel="Masuk sebagai Tamu"
              accessibilityRole="button"
            >
              <ThemedText style={styles.buttonText}>
                Masuk sebagai Tamu
              </ThemedText>
            </AccessibleTouchableOpacity>
          </View>
        </View>
      )}

      <TouchableOpacity
        onPress={() => navigation.navigate("Register" as any)}
        accessibilityRole="link"
        accessibilityLabel="Belum punya akun? Daftar sekarang"
      >
        <Text style={[styles.link, { color: theme.colors.primary }]}>
          Belum punya akun? Daftar
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  buttonContainer: {
    marginBottom: 20,
    gap: 10,
  },
  button: {
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  guestButton: {
    backgroundColor: "#e0e0e0",
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
    color: "#2196F3",
    textAlign: "center",
    marginTop: 10,
  },
});
