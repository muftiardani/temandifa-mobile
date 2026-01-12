import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useThemeStore } from "../../stores/themeStore";
import { ThemedText } from "../../components/atoms/ThemedText";
import { ThemedView } from "../../components/atoms/ThemedView";

export default function LanguageScreen() {
  const { i18n } = useTranslation();
  const currentLang = i18n.language;
  const { theme } = useThemeStore();

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  const LanguageItem = ({ code, name }: { code: string; name: string }) => (
    <ThemedView style={styles.item} variant="surface">
      <TouchableOpacity
        style={styles.touchable}
        onPress={() => changeLanguage(code)}
      >
        <ThemedText style={styles.text}>{name}</ThemedText>
        {currentLang === code && (
          <Ionicons name="checkmark" size={24} color={theme.colors.primary} />
        )}
      </TouchableOpacity>
    </ThemedView>
  );

  return (
    <ThemedView style={styles.container}>
      <LanguageItem code="id" name="Bahasa Indonesia" />
      <View
        style={[styles.separator, { backgroundColor: theme.colors.border }]}
      />
      <LanguageItem code="en" name="English" />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 20,
  },
  item: {
    // Container for touchable
  },
  touchable: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: "transparent", // Let ThemedView bg show
  },
  text: {
    fontSize: 16,
  },
  separator: {
    height: 1,
    marginLeft: 20,
  },
});
