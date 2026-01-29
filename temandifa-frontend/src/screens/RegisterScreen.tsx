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
import { register as registerApi } from "../services/authService";
import { useNavigation } from "@react-navigation/native";
import { useThemeStore } from "../stores/themeStore";
import Toast from "react-native-toast-message";

import { AccessibleTextInput } from "../components/molecules/AccessibleTextInput";

export default function RegisterScreen() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();
  const { theme } = useThemeStore();

  async function handleRegister() {
    setLoading(true);
    try {
      await registerApi(fullName, email, password);
      Toast.show({
        type: "success",
        text1: "Registrasi Berhasil",
        text2: "Silakan login dengan akun baru Anda",
      });
      navigation.goBack();
    } catch (e: any) {
      Toast.show({
        type: "error",
        text1: "Registrasi Gagal",
        text2: e.toString(),
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Text style={[styles.title, { color: theme.colors.text }]}>
        Daftar Akun
      </Text>

      <AccessibleTextInput
        label="Nama Lengkap"
        placeholder="John Doe"
        value={fullName}
        onChangeText={setFullName}
        accessibilityHint="Masukkan nama lengkap anda"
      />

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
        accessibilityHint="Masukkan kata sandi baru"
      />

      {loading ? (
        <ActivityIndicator size="large" color={theme.colors.primary} />
      ) : (
        <View style={styles.buttonContainer}>
          <AccessibleTouchableOpacity
            style={[styles.button, { backgroundColor: theme.colors.primary }]}
            onPress={handleRegister}
            accessibilityLabel="Tombol Daftar"
            accessibilityHint="Menekan tombol ini akan membuat akun baru"
            accessibilityRole="button"
          >
            <ThemedText style={styles.buttonText}>Daftar</ThemedText>
          </AccessibleTouchableOpacity>
        </View>
      )}

      <TouchableOpacity
        onPress={() => navigation.goBack()}
        accessibilityRole="link"
        accessibilityLabel="Sudah punya akun? Masuk sekarang"
      >
        <Text style={[styles.link, { color: theme.colors.primary }]}>
          Sudah punya akun? Masuk
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
    borderColor: "#ddd",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  buttonContainer: {
    marginBottom: 20,
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
  link: {
    textAlign: "center",
    marginTop: 10,
  },
});
