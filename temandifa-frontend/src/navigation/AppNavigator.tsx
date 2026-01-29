import React, { useEffect } from "react";
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View } from "react-native";
import { useAuthStore } from "../stores/authStore";
import { useThemeStore } from "../stores/themeStore";
import { RootStackParamList } from "../types/navigation";

// Components
import { NetworkBanner } from "../components/molecules/NetworkBanner";
import { OfflineBanner } from "../components/molecules/OfflineBanner";

// Screens
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import HomeScreen from "../screens/HomeScreen";
import CameraScreen from "../screens/CameraScreen";
import ScanScreen from "../screens/ScanScreen";
import DocumentScannerScreen from "../screens/DocumentScannerScreen";
import VoiceScreen from "../screens/VoiceScreen";
import HistoryScreen from "../screens/HistoryScreen";
import ProfileScreen from "../screens/ProfileScreen";
import SettingsScreen from "../screens/SettingsScreen";

// Settings Sub-screens
import LanguageScreen from "../screens/settings/LanguageScreen";
import HelpScreen from "../screens/settings/HelpScreen";
import PrivacyScreen from "../screens/settings/PrivacyScreen";
import AboutScreen from "../screens/settings/AboutScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  const { isAuthenticated, loading, initialize } = useAuthStore();
  const { theme, isDark } = useThemeStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

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

  const linking = {
    prefixes: ["temandifa://", "https://temandifa.com"],
    config: {
      screens: {
        Login: "login",
        Register: "register",
        Home: "home",
        History: "history",
        Settings: "settings",
        // Add more as needed
      },
    },
  };

  return (
    <NavigationContainer theme={navTheme} linking={linking}>
      <NetworkBanner />
      <OfflineBanner />
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
            <Stack.Screen
              name="History"
              component={HistoryScreen}
              options={{
                title: "Riwayat Aktivitas",
                headerBackTitle: "Kembali",
              }}
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
