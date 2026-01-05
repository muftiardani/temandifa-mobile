import { NativeStackNavigationProp } from "@react-navigation/native-stack";

export type RootStackParamList = {
  // Auth Stack
  Login: undefined;
  Register: undefined;

  // Main App Stack
  Home: undefined;

  // Features
  Camera: undefined; // Object Detection Only
  Scan: undefined; // Scan Menu (Camera vs Upload)
  DocumentScanner: undefined; // OCR Camera Only
  Voice: undefined;

  // Profile & Settings
  Profile: undefined;
  Settings: undefined;

  // Settings Sub-screens
  Language: undefined;
  Help: undefined;
  Privacy: undefined;
  About: undefined;
};

export type HomeScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "Home"
>;
