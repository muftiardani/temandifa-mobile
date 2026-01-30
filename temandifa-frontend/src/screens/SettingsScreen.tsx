import React from "react";
import { View, StyleSheet, ScrollView, Switch } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useScreenReaderFocus } from "../hooks/useScreenReaderFocus";
import { useThemeStore } from "../stores/themeStore";
import { ThemedText } from "../components/atoms/ThemedText";
import { ThemedView } from "../components/atoms/ThemedView";
import { AccessibleTouchableOpacity } from "../components/wrappers/AccessibleTouchableOpacity";

export default function SettingsScreen() {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { theme, isDark, toggleTheme } = useThemeStore();
  const focusRef = useScreenReaderFocus();

  interface MenuItemProps {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    onPress?: () => void;
    hasSwitch?: boolean;
    value?: boolean;
    onValueChange?: (value: boolean) => void;
    color?: string;
  }

  const MenuItem = ({
    icon,
    title,
    onPress,
    hasSwitch = false,
    value = false,
    onValueChange,
    color,
  }: MenuItemProps) => (
    <AccessibleTouchableOpacity
      style={[styles.menuItem, { backgroundColor: theme.colors.surface }]}
      onPress={onPress}
      disabled={hasSwitch}
      accessibilityLabel={title}
      accessibilityRole={hasSwitch ? "switch" : "button"}
      accessibilityState={hasSwitch ? { checked: value } : undefined}
    >
      <View style={styles.menuLeft}>
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor: hasSwitch
                ? theme.colors.primary + (isDark ? "30" : "20") // 20% opacity for light, 30% for dark
                : theme.colors.iconBackground,
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
        <ThemedText style={styles.menuText}>{title}</ThemedText>
      </View>

      {hasSwitch ? (
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{
            false: theme.colors.border,
            true: theme.colors.primary + "80",
          }}
          thumbColor={value ? theme.colors.primary : "#f4f3f4"}
        />
      ) : (
        <Ionicons
          name="chevron-forward"
          size={20}
          color={theme.colors.textSecondary}
        />
      )}
    </AccessibleTouchableOpacity>
  );

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Section: Tampilan & Preferensi */}
        <ThemedText
          variant="caption"
          style={styles.sectionHeader}
          ref={focusRef}
        >
          {t("settings.appearance")}
        </ThemedText>
        <ThemedView
          variant="surface"
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
        </ThemedView>

        {/* Section: Informasi & Bantuan */}
        <ThemedText variant="caption" style={styles.sectionHeader}>
          {t("settings.info")}
        </ThemedText>
        <ThemedView
          variant="surface"
          style={[styles.section, { borderColor: theme.colors.border }]}
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
        </ThemedView>
      </ScrollView>

      {/* Footer Version */}
      <View style={styles.footer}>
        <ThemedText variant="caption" style={styles.versionText}>
          TemanDifa v1.0.0
        </ThemedText>
        <ThemedText variant="caption">© 2024 TemanDifa Team</ThemedText>
      </View>
    </ThemedView>
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
