import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../stores/authStore";
import { useNavigation } from "@react-navigation/native";
import { useThemeStore } from "../stores/themeStore";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types/navigation";
import Toast from "react-native-toast-message";

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
      Alert.alert("Login Gagal", e.toString());
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
      Alert.alert("Login Gagal", "Verifikasi biometrik gagal atau dibatalkan.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Text style={[styles.title, { color: theme.colors.text }]}>Masuk</Text>

      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: theme.colors.surface,
            color: theme.colors.text,
            borderColor: theme.colors.border,
          },
        ]}
        placeholder="Email"
        placeholderTextColor={theme.colors.textSecondary}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: theme.colors.surface,
            color: theme.colors.text,
            borderColor: theme.colors.border,
          },
        ]}
        placeholder="Password"
        placeholderTextColor={theme.colors.textSecondary}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      {loading ? (
        <ActivityIndicator size="large" color={theme.colors.primary} />
      ) : (
        <View style={styles.buttonContainer}>
          <Button
            title="Masuk"
            onPress={handleLogin}
            color={theme.colors.primary}
          />

          {isBiometricEnabled && (
            <TouchableOpacity
              style={[styles.bioButton, { borderColor: theme.colors.primary }]}
              onPress={handleBiometricLogin}
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
            <Button
              title="Masuk sebagai Tamu"
              onPress={loginAsGuest}
              color={theme.colors.textSecondary}
            />
          </View>
        </View>
      )}

      <TouchableOpacity onPress={() => navigation.navigate("Register" as any)}>
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
