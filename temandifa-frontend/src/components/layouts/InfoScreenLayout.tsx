import React from "react";
import { StyleSheet, ScrollView, ViewStyle } from "react-native";
import { ThemedView } from "../atoms/ThemedView";
import { ThemedText } from "../atoms/ThemedText";
import { useScreenReaderFocus } from "../../hooks/useScreenReaderFocus";

interface InfoScreenLayoutProps {
  title: string;
  children: React.ReactNode;
  contentContainerStyle?: ViewStyle;
}

export function InfoScreenLayout({
  title,
  children,
  contentContainerStyle,
}: InfoScreenLayoutProps) {
  const focusRef = useScreenReaderFocus();

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, contentContainerStyle]}
      >
        <ThemedText variant="title" style={styles.title} ref={focusRef}>
          {title}
        </ThemedText>
        {children}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
});
