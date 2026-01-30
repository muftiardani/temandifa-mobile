import React from "react";
import { StyleSheet, View } from "react-native";
import { useThemeStore } from "../../stores/themeStore";
import { ThemedText } from "../atoms/ThemedText";
import { useScreenReaderFocus } from "../../hooks/useScreenReaderFocus";

interface AuthLayoutProps {
  title: string;
  children: React.ReactNode;
}

export function AuthLayout({ title, children }: AuthLayoutProps) {
  const { theme } = useThemeStore();
  const focusRef = useScreenReaderFocus();

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <ThemedText variant="title" style={styles.title} ref={focusRef}>
        {title}
      </ThemedText>
      {children}
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
    textAlign: "center",
    marginBottom: 20,
  },
});
