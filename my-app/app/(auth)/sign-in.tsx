/**
 * app/(auth)/sign-in.tsx — Sign-In Screen
 *
 * Responsibilities:
 *   - Email/password login form (Formik + Yup)
 *   - Calls POST /auth/login; on success passes token + user to AuthContext
 *   - NavigationGuard in the root layout handles the redirect after login
 */

import React, { useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link } from "expo-router";
import { Formik } from "formik";
import * as Yup from "yup";
import { useAuth } from "@/context/AuthProvider";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Purple } from "@/constants/theme";

const schema = Yup.object().shape({
  email: Yup.string().email("Invalid email").required("Email is required"),
  password: Yup.string()
    .min(6, "Password must be at least 6 characters")
    .max(72, "Password must be 72 characters or fewer")
    .required("Password is required"),
});

export default function SignInScreen() {
  const { login } = useAuth();
  const [apiError, setApiError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const passwordRef = useRef<TextInput>(null);

  const handleSubmit = async (values: { email: string; password: string }) => {
    setApiError(null);
    try {
      const res = await fetch(`${process.env.EXPO_PUBLIC_API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: values.email, password: values.password }),
      });
      let data: Record<string, unknown> = {};
      try {
        data = await res.json();
      } catch {}
      if (!res.ok) throw new Error((data.detail as string) || "Invalid email or password");
      // login() persists credentials; NavigationGuard handles the redirect
      await login(data.token, data.user);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    }
  };

  return (
    <SafeAreaView style={s.flex}>
      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
          <View style={s.brand}>
            <Text style={s.brandName}>neuro</Text>
          </View>

          <Text style={s.title}>Welcome back</Text>
          <Text style={s.subtitle}>Sign in to your account</Text>

          <Formik
            initialValues={{ email: "", password: "" }}
            validationSchema={schema}
            onSubmit={handleSubmit}
          >
            {({ handleChange, handleBlur, handleSubmit, values, errors, touched, isSubmitting }) => (
              <View style={s.form}>
                {apiError ? (
                  <View style={s.errorBanner}>
                    <Text style={s.errorBannerText}>{apiError}</Text>
                  </View>
                ) : null}

                <Input
                  label="Email"
                  error={errors.email}
                  touched={touched.email}
                  placeholder="you@example.com"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  returnKeyType="next"
                  value={values.email}
                  onChangeText={handleChange("email")}
                  onBlur={handleBlur("email")}
                  onSubmitEditing={() => passwordRef.current?.focus()}
                />

                {/* Password field with inline show/hide toggle */}
                <View style={s.passwordContainer}>
                  <Text style={s.passwordLabel}>Password</Text>
                  <View style={s.passwordRow}>
                    <TextInput
                      ref={passwordRef}
                      style={[
                        s.passwordInput,
                        touched.password && errors.password ? s.inputError : null,
                      ]}
                      placeholder="••••••••"
                      placeholderTextColor="#aaa"
                      secureTextEntry={!showPassword}
                      textContentType="password"
                      returnKeyType="done"
                      value={values.password}
                      onChangeText={handleChange("password")}
                      onBlur={handleBlur("password")}
                      onSubmitEditing={() => handleSubmit()}
                    />
                    <Pressable
                      style={s.eyeButton}
                      onPress={() => setShowPassword((v) => !v)}
                      hitSlop={8}
                    >
                      <Text style={s.eyeText}>{showPassword ? "Hide" : "Show"}</Text>
                    </Pressable>
                  </View>
                  {touched.password && errors.password ? (
                    <Text style={s.fieldError}>{errors.password}</Text>
                  ) : null}
                </View>

                <Button
                  label="Sign In"
                  loadingLabel="Signing in…"
                  loading={isSubmitting}
                  onPress={() => handleSubmit()}
                  style={s.submitButton}
                />

                <View style={s.footer}>
                  <Text style={s.footerText}>Don't have an account?</Text>
                  <Link href="/(auth)/sign-up" asChild>
                    <Pressable hitSlop={8}>
                      <Text style={s.footerLink}> Create one</Text>
                    </Pressable>
                  </Link>
                </View>
              </View>
            )}
          </Formik>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flexGrow: 1,
    padding: 24,
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  brand: { alignItems: "center", marginBottom: 32 },
  brandName: {
    fontSize: 36,
    fontWeight: "800",
    color: Purple.primary,
    letterSpacing: -1,
  },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 4, color: "#111" },
  subtitle: { fontSize: 15, color: "#666", marginBottom: 28 },
  form: { gap: 0 },
  errorBanner: {
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  errorBannerText: { color: "#b91c1c", fontSize: 14 },
  passwordContainer: { marginBottom: 14 },
  passwordLabel: { fontSize: 13, fontWeight: "600", color: "#333", marginBottom: 7 },
  passwordRow: { flexDirection: "row", alignItems: "center" },
  passwordInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    borderRightWidth: 0,
    paddingHorizontal: 13,
    paddingVertical: 12,
    fontSize: 15,
    color: "#111",
  },
  eyeButton: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    justifyContent: "center",
  },
  eyeText: { fontSize: 13, fontWeight: "600", color: "#555" },
  inputError: { borderColor: "#ef4444" },
  fieldError: { color: "#ef4444", fontSize: 12, marginTop: 5 },
  submitButton: { marginTop: 8, flex: undefined },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 20 },
  footerText: { color: "#666", fontSize: 14 },
  footerLink: { color: Purple.primary, fontSize: 14, fontWeight: "600" },
});
