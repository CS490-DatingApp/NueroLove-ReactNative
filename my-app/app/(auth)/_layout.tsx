/**
 * app/(auth)/_layout.tsx — Auth Stack Layout
 *
 * Responsibilities:
 *   - Provides the Stack navigator for sign-in and sign-up screens
 *   - Shows a loading spinner while the app reads saved credentials
 *
 * Note: Routing decisions (who belongs in auth vs. the main app)
 * are handled centrally by NavigationGuard in app/_layout.tsx.
 * This file does NOT perform any redirects.
 */

import { ActivityIndicator, View } from "react-native";
import { Stack } from "expo-router";
import { useAuth } from "@/context/AuthProvider";

export default function AuthLayout() {
  const { isLoading } = useAuth();

  // Show a spinner while SecureStore is being read on app launch
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
