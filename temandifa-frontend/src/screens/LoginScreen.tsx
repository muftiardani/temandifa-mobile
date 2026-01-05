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
import { useAuth } from "../context/AuthContext";
import { login as loginApi } from "../services/authService";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types/navigation";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, loginAsGuest } = useAuth();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  async function handleLogin() {
    setLoading(true);
    try {
      const data = await loginApi(email, password);
      await login(data.token, data.user);
    } catch (e: any) {
      Alert.alert("Login Gagal", e.toString());
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Masuk</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      {loading ? (
        <ActivityIndicator size="large" color="#2196F3" />
      ) : (
        <View style={styles.buttonContainer}>
          <Button title="Masuk" onPress={handleLogin} />
          <View style={{ marginTop: 10 }}>
            <Button
              title="Masuk sebagai Tamu"
              onPress={loginAsGuest}
              color="#666"
            />
          </View>
        </View>
      )}

      <TouchableOpacity onPress={() => navigation.navigate("Register" as any)}>
        <Text style={styles.link}>Belum punya akun? Daftar</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#fff",
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
    gap: 10,
  },
  guestButton: {
    backgroundColor: "#e0e0e0",
  },
  link: {
    color: "#2196F3",
    textAlign: "center",
    marginTop: 10,
  },
});
