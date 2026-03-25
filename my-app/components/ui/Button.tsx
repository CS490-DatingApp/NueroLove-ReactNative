/**
 * components/ui/Button.tsx — Reusable Button
 *
 * Variants: primary (filled purple) | secondary (outlined) | ghost (text-only) | danger (red outline)
 * Pass loading + loadingLabel to show a spinner and alternate label while async work runs.
 */

import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  ViewStyle,
} from "react-native";
import { Purple } from "@/constants/theme";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  loadingLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  label,
  onPress,
  variant = "primary",
  disabled,
  loading,
  loadingLabel,
  style,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        s.base,
        variant === "primary" && s.primary,
        variant === "secondary" && s.secondary,
        variant === "ghost" && s.ghost,
        variant === "danger" && s.danger,
        pressed && !isDisabled && s.pressed,
        isDisabled && s.disabled,
        style,
      ]}
    >
      {loading && (
        <ActivityIndicator
          size="small"
          color={variant === "primary" ? "#fff" : Purple.primary}
        />
      )}
      <Text
        style={[
          s.label,
          variant === "primary" && s.labelPrimary,
          variant === "secondary" && s.labelSecondary,
          variant === "ghost" && s.labelGhost,
          variant === "danger" && s.labelDanger,
        ]}
      >
        {loading ? (loadingLabel ?? label) : label}
      </Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  primary: { backgroundColor: Purple.primary },
  secondary: { borderWidth: 1.5, borderColor: Purple.primary },
  ghost: {},
  danger: { borderWidth: 1.5, borderColor: "#ef4444" },
  pressed: { opacity: 0.82 },
  disabled: { opacity: 0.45 },
  label: { fontSize: 15, fontWeight: "700" },
  labelPrimary: { color: "#fff" },
  labelSecondary: { color: Purple.primary },
  labelGhost: { color: Purple.primary },
  labelDanger: { color: "#ef4444" },
});
