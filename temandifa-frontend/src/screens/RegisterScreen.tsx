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
import { register as registerApi } from "../services/authService";
import { useNavigation } from "@react-navigation/native";
import { useThemeStore } from "../stores/themeStore";
import Toast from "react-native-toast-message";

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
      Alert.alert("Registrasi Gagal", e.toString());
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

      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: theme.colors.surface,
            color: theme.colors.text,
            borderColor: theme.colors.border,
          },
        ]}
        placeholder="Nama Lengkap"
        placeholderTextColor={theme.colors.textSecondary}
        value={fullName}
        onChangeText={setFullName}
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
            title="Daftar"
            onPress={handleRegister}
            color={theme.colors.primary}
          />
        </View>
      )}

      <TouchableOpacity onPress={() => navigation.goBack()}>
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
  link: {
    textAlign: "center",
    marginTop: 10,
  },
});
