import React, { forwardRef } from "react";
import { TextInput, TextInputProps, StyleSheet, View } from "react-native";
import { useThemeStore } from "../../stores/themeStore";
import { ThemedText } from "../atoms/ThemedText";
import { Spacing, BorderRadius } from "../../constants/layout";

export interface AccessibleTextInputProps extends TextInputProps {
  label: string;
  error?: string;
  accessibilityHint?: string;
}

export const AccessibleTextInput = forwardRef<
  TextInput,
  AccessibleTextInputProps
>(({ label, error, accessibilityHint, style, ...props }, ref) => {
  const { theme } = useThemeStore();

  // Focus input when error changes? Optional enhancement.

  return (
    <View style={styles.container}>
      <ThemedText
        variant="caption"
        style={styles.label}
        color={theme.colors.textSecondary}
      >
        {label}
      </ThemedText>

      <TextInput
        ref={ref}
        style={[
          styles.input,
          {
            backgroundColor: theme.colors.surface,
            color: theme.colors.text,
            borderColor: error ? theme.colors.error : theme.colors.border,
          },
          style,
        ]}
        placeholderTextColor={theme.colors.textSecondary}
        accessibilityLabel={label}
        accessibilityHint={accessibilityHint}
        accessibilityState={{
          disabled: props.editable === false,
          // @ts-ignore
          invalid: !!error,
        }}
        {...props}
      />

      {error && (
        <ThemedText
          variant="caption"
          color={theme.colors.error}
          style={styles.errorText}
        >
          {error}
        </ThemedText>
      )}
    </View>
  );
});

AccessibleTextInput.displayName = "AccessibleTextInput";

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  label: {
    marginBottom: Spacing.xs,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    fontSize: 16,
  },
  errorText: {
    marginTop: 4,
  },
});
