import React from "react";
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View } from "react-native";

import "./src/i18n"; // Initialize i18n
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import { ThemeProvider, useTheme } from "./src/context/ThemeContext";
import { RootStackParamList } from "./src/types/navigation";

// Screens - Auth
import LoginScreen from "./src/screens/LoginScreen";
import RegisterScreen from "./src/screens/RegisterScreen";

// Screens - Core
import HomeScreen from "./src/screens/HomeScreen";
import CameraScreen from "./src/screens/CameraScreen"; // Object Detection
import ScanScreen from "./src/screens/ScanScreen"; // Scan Menu
import DocumentScannerScreen from "./src/screens/DocumentScannerScreen"; // OCR
import VoiceScreen from "./src/screens/VoiceScreen";

// Screens - Profile & Settings
import ProfileScreen from "./src/screens/ProfileScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import LanguageScreen from "./src/screens/settings/LanguageScreen";
import HelpScreen from "./src/screens/settings/HelpScreen";
import PrivacyScreen from "./src/screens/settings/PrivacyScreen";
import AboutScreen from "./src/screens/settings/AboutScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();

function Navigation() {
  const { isAuthenticated, loading } = useAuth();
  const { theme, isDark } = useTheme();

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: theme.colors.background,
        }}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  // Create a Navigation Theme object based on our ThemeContext
  const navTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      primary: theme.colors.primary,
      background: theme.colors.background,
      card: theme.colors.surface,
      text: theme.colors.text,
      border: theme.colors.border,
      notification: theme.colors.error,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: theme.colors.surface,
          },
          headerTintColor: theme.colors.text,
          headerTitleStyle: {
            fontWeight: "bold",
          },
        }}
      >
        {isAuthenticated ? (
          // App Stack (User is logged in)
          <>
            <Stack.Screen
              name="Home"
              component={HomeScreen}
              options={{
                title: "TemanDifa",
                headerTitleAlign: "center",
                headerShown: false,
              }}
            />

            {/* Features */}
            <Stack.Screen
              name="Camera"
              component={CameraScreen}
              options={{ title: "Deteksi Objek", headerBackTitle: "Kembali" }}
            />
            <Stack.Screen
              name="Scan"
              component={ScanScreen}
              options={{
                title: "Pindai Dokumen",
                headerBackTitle: "Kembali",
                headerTitleAlign: "center",
              }}
            />
            <Stack.Screen
              name="DocumentScanner"
              component={DocumentScannerScreen}
              options={{ title: "Kamera Dokumen", headerBackTitle: "Kembali" }}
            />
            <Stack.Screen
              name="Voice"
              component={VoiceScreen}
              options={{ title: "Rekam Suara", headerBackTitle: "Kembali" }}
            />

            {/* Profile & Settings */}
            <Stack.Screen
              name="Profile"
              component={ProfileScreen}
              options={{ title: "Profil Saya", headerBackTitle: "Kembali" }}
            />
            <Stack.Screen
              name="Settings"
              component={SettingsScreen}
              options={{ title: "Pengaturan", headerBackTitle: "Kembali" }}
            />

            {/* Settings Sub-screens */}
            <Stack.Screen
              name="Language"
              component={LanguageScreen}
              options={{ title: "Bahasa", headerBackTitle: "Kembali" }}
            />
            <Stack.Screen
              name="Help"
              component={HelpScreen}
              options={{
                title: "Panduan & Bantuan",
                headerBackTitle: "Kembali",
              }}
            />
            <Stack.Screen
              name="Privacy"
              component={PrivacyScreen}
              options={{
                title: "Kebijakan Privasi",
                headerBackTitle: "Kembali",
              }}
            />
            <Stack.Screen
              name="About"
              component={AboutScreen}
              options={{
                title: "Tentang Aplikasi",
                headerBackTitle: "Kembali",
              }}
            />
          </>
        ) : (
          // Auth Stack (User is logged out)
          <>
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Register"
              component={RegisterScreen}
              options={{ title: "Daftar Akun" }}
            />
          </>
        )}
      </Stack.Navigator>
      <StatusBar style={isDark ? "light" : "dark"} />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <Navigation />
      </ThemeProvider>
    </AuthProvider>
  );
}
