import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "../context/ThemeContext";

export default function SettingsScreen() {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { theme, isDark, toggleTheme } = useTheme();

  const MenuItem = ({
    icon,
    title,
    onPress,
    hasSwitch = false,
    value = false,
    onValueChange,
    color,
  }: any) => (
    <TouchableOpacity
      style={[styles.menuItem, { backgroundColor: theme.colors.surface }]}
      onPress={onPress}
      disabled={hasSwitch}
    >
      <View style={styles.menuLeft}>
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor: hasSwitch
                ? isDark
                  ? "#1a3b5c"
                  : "#E3F2FD"
                : isDark
                ? "#2C2C2E"
                : "#F5F5F5",
            },
          ]}
        >
          <Ionicons
            name={icon}
            size={22}
            color={
              hasSwitch ? theme.colors.primary : color || theme.colors.text
            }
          />
        </View>
        <Text style={[styles.menuText, { color: theme.colors.text }]}>
          {title}
        </Text>
      </View>

      {hasSwitch ? (
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: "#767577", true: "#81b0ff" }}
          thumbColor={value ? theme.colors.primary : "#f4f3f4"}
        />
      ) : (
        <Ionicons
          name="chevron-forward"
          size={20}
          color={theme.colors.textSecondary}
        />
      )}
    </TouchableOpacity>
  );

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.content}>
        {/* Section: Tampilan & Preferensi */}
        <Text
          style={[styles.sectionHeader, { color: theme.colors.textSecondary }]}
        >
          {t("settings.appearance")}
        </Text>
        <View
          style={[
            styles.section,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <MenuItem
            icon="moon"
            title={t("settings.dark_mode")}
            hasSwitch={true}
            value={isDark}
            onValueChange={toggleTheme}
          />
          <View
            style={[styles.separator, { backgroundColor: theme.colors.border }]}
          />
          <MenuItem
            icon="language"
            title={t("settings.language")}
            onPress={() => navigation.navigate("Language" as never)}
          />
        </View>

        {/* Section: Informasi & Bantuan */}
        <Text
          style={[styles.sectionHeader, { color: theme.colors.textSecondary }]}
        >
          {t("settings.info")}
        </Text>
        <View
          style={[
            styles.section,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <MenuItem
            icon="help-circle"
            title={t("settings.help")}
            onPress={() => navigation.navigate("Help" as never)}
          />
          <View
            style={[styles.separator, { backgroundColor: theme.colors.border }]}
          />
          <MenuItem
            icon="shield-checkmark"
            title={t("settings.privacy")}
            onPress={() => navigation.navigate("Privacy" as never)}
          />
          <View
            style={[styles.separator, { backgroundColor: theme.colors.border }]}
          />
          <MenuItem
            icon="information-circle"
            title={t("settings.about")}
            onPress={() => navigation.navigate("About" as never)}
          />
        </View>
      </ScrollView>

      {/* Footer Version */}
      <View style={styles.footer}>
        <Text
          style={[styles.versionText, { color: theme.colors.textSecondary }]}
        >
          TemanDifa v1.0.0
        </Text>
        <Text
          style={[styles.copyrightText, { color: theme.colors.textSecondary }]}
        >
          © 2024 TemanDifa Team
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingVertical: 20,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
    marginLeft: 20,
    marginTop: 10,
    letterSpacing: 0.5,
  },
  section: {
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  menuItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  menuLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  menuText: {
    fontSize: 16,
    fontWeight: "500",
  },
  separator: {
    height: 1,
    marginLeft: 64,
  },
  footer: {
    padding: 20,
    alignItems: "center",
    marginBottom: 10,
  },
  versionText: {
    fontWeight: "600",
    fontSize: 14,
    marginBottom: 4,
  },
  copyrightText: {
    fontSize: 12,
  },
});
