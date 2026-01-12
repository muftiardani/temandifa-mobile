import * as LocalAuthentication from "expo-local-authentication";
import { Logger } from "./logger";

export const BiometricService = {
  async isHardwareSupported(): Promise<boolean> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      return hasHardware && isEnrolled;
    } catch (error) {
      Logger.error("BiometricService", "Hardware check failed", error);
      return false;
    }
  },

  async authenticate(
    promptMessage: string = "Konfirmasi Identitas"
  ): Promise<boolean> {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: promptMessage,
        fallbackLabel: "Gunakan Password",
        cancelLabel: "Batal",
        disableDeviceFallback: false,
      });

      return result.success;
    } catch (error) {
      Logger.error("BiometricService", "Authentication failed", error);
      return false;
    }
  },

  async getBiometricType(): Promise<
    "FACE" | "FINGERPRINT" | "IRIS" | "UNKNOWN"
  > {
    try {
      const types =
        await LocalAuthentication.supportedAuthenticationTypesAsync();
      if (
        types.includes(
          LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION
        )
      ) {
        return "FACE";
      }
      if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        return "FINGERPRINT";
      }
      if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
        return "IRIS";
      }
      return "UNKNOWN";
    } catch {
      return "UNKNOWN";
    }
  },
};
