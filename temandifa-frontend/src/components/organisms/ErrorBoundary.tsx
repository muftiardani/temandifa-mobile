/**
 * ErrorBoundary Component
 *
 * Catches JavaScript errors in child component tree and displays fallback UI.
 */

import React, { Component, ErrorInfo, ReactNode } from "react";
import { View, StyleSheet, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Logger } from "../../services/logger";
import { useTranslation } from "react-i18next";
import { useThemeStore } from "../../stores/themeStore";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  // Injected props
  t: (key: string) => string;
  theme: any;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundaryInner extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    Logger.error("ErrorBoundary", "Uncaught error:", { error, errorInfo });
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    const { t, theme, children, fallback } = this.props;

    if (this.state.hasError) {
      if (fallback) {
        return fallback;
      }

      return (
        <View
          style={[
            styles.container,
            { backgroundColor: theme.colors.background },
          ]}
        >
          <Ionicons
            name="warning-outline"
            size={64}
            color={theme.colors.error}
          />
          <Text style={[styles.title, { color: theme.colors.text }]}>
            {t("errors.crash_title")}
          </Text>
          <Text style={[styles.message, { color: theme.colors.textSecondary }]}>
            {t("errors.crash_message")}
          </Text>
          {__DEV__ && this.state.error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>
                {this.state.error.toString()}
              </Text>
            </View>
          )}
          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.colors.primary }]}
            onPress={this.handleRetry}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={20} color="white" />
            <Text style={styles.buttonText}>{t("common.retry")}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return children;
  }
}

// Functional Wrapper to inject hooks
export const ErrorBoundary = (props: Omit<Props, "t" | "theme">) => {
  const { t } = useTranslation();
  const { theme } = useThemeStore();

  return <ErrorBoundaryInner {...props} t={t} theme={theme} />;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginTop: 16,
    textAlign: "center",
  },
  message: {
    fontSize: 16,
    marginTop: 8,
    textAlign: "center",
    lineHeight: 24,
  },
  errorBox: {
    marginTop: 16,
    padding: 12,
    backgroundColor: "#FFF0F0",
    borderRadius: 8,
    maxWidth: "100%",
  },
  errorText: {
    fontSize: 12,
    color: "#FF6B6B",
    fontFamily: "monospace",
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
  },
});

export default ErrorBoundary;
