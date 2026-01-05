import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../context/ThemeContext";

export default function LanguageScreen() {
  const { i18n } = useTranslation();
  const currentLang = i18n.language;
  const { theme } = useTheme();

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  const LanguageItem = ({ code, name }: { code: string; name: string }) => (
    <TouchableOpacity
      style={[styles.item, { backgroundColor: theme.colors.surface }]}
      onPress={() => changeLanguage(code)}
    >
      <Text style={[styles.text, { color: theme.colors.text }]}>{name}</Text>
      {currentLang === code && (
        <Ionicons name="checkmark" size={24} color={theme.colors.primary} />
      )}
    </TouchableOpacity>
  );

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <LanguageItem code="id" name="Bahasa Indonesia" />
      <View
        style={[styles.separator, { backgroundColor: theme.colors.border }]}
      />
      <LanguageItem code="en" name="English" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 20,
  },
  item: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
  },
  text: {
    fontSize: 16,
  },
  separator: {
    height: 1,
    marginLeft: 20,
  },
});
