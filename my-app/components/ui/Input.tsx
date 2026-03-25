/**
 * components/ui/Input.tsx — Reusable Labeled Text Input
 *
 * Wraps TextInput with an optional label, required indicator (*),
 * helper text, and inline error message. Error only shows when
 * the field has been touched (Formik-compatible).
 * Supports forwardRef so parents can focus the input programmatically.
 */

import React from "react";
import {
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
} from "react-native";

interface InputProps extends React.ComponentProps<typeof TextInput> {
  label?: string;
  required?: boolean;
  error?: string;
  touched?: boolean;
  helper?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

export const Input = React.forwardRef<TextInput, InputProps>(function Input(
  { label, required, error, touched, helper, containerStyle, style, ...props },
  ref,
) {
  const showError = Boolean(touched && error);

  return (
    <View style={[s.container, containerStyle]}>
      {label ? (
        <Text style={s.label}>
          {label}
          {required ? <Text style={s.required}> *</Text> : null}
        </Text>
      ) : null}
      <TextInput
        ref={ref}
        placeholderTextColor="#aaa"
        style={[s.input, showError && s.inputError, style]}
        {...props}
      />
      {helper && !showError ? <Text style={s.helper}>{helper}</Text> : null}
      {showError ? <Text style={s.error}>{error}</Text> : null}
    </View>
  );
});

const s = StyleSheet.create({
  container: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: "600", color: "#333", marginBottom: 7 },
  required: { color: "#ef4444" },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 12,
    fontSize: 15,
    color: "#111",
  },
  inputError: { borderColor: "#ef4444" },
  helper: { fontSize: 12, color: "#999", marginTop: 5 },
  error: { fontSize: 12, color: "#ef4444", marginTop: 5 },
});
