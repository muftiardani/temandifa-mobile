import * as Haptics from "expo-haptics";

/**
 * Haptic feedback utility for consistent haptic patterns across the app
 */
export const haptics = {
  /**
   * Light tap - for button presses, selections
   */
  light: async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Haptics not available on this device
    }
  },

  /**
   * Medium tap - for important actions like capture, submit
   */
  medium: async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      // Haptics not available on this device
    }
  },

  /**
   * Heavy tap - for significant actions
   */
  heavy: async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch {
      // Haptics not available on this device
    }
  },

  /**
   * Success feedback - for completed actions
   */
  success: async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // Haptics not available on this device
    }
  },

  /**
   * Warning feedback - for alerts, confirmations
   */
  warning: async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch {
      // Haptics not available on this device
    }
  },

  /**
   * Error feedback - for errors, failures
   */
  error: async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch {
      // Haptics not available on this device
    }
  },

  /**
   * Selection change feedback - for toggles, sliders
   */
  selection: async () => {
    try {
      await Haptics.selectionAsync();
    } catch {
      // Haptics not available on this device
    }
  },
};
