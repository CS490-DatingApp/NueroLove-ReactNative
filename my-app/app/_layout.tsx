/**
 * app/_layout.tsx — Root Layout
 *
 * Responsibilities:
 *   - Wraps the entire app in global providers (Auth, Chat, Theme)
 *   - Contains NavigationGuard, which is the single source of truth
 *     for deciding which section of the app the user belongs in
 *
 * Routing rules (enforced by NavigationGuard):
 *   - Not logged in                → (auth)/sign-in
 *   - Logged in, onboarding done   → (tabs)
 *   - Logged in, no onboarding     → onboarding
 */

import { useEffect, useRef } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { AuthProvider, useAuth } from "@/context/AuthProvider";
import { ChatProvider, useChat } from "@/context/ChatContext";

/**
 * NavigationGuard sits inside AuthProvider so it can read auth state.
 * It uses useSegments + useEffect to redirect — never during render —
 * which prevents the "Maximum update depth exceeded" infinite loop.
 */
function NavigationGuard() {
  const { user, isLoading } = useAuth();
  const { clearMessages } = useChat();
  const segments = useSegments();
  const router = useRouter();

  // Track the previous user ID so we know when the account changes
  const prevUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Wait until SecureStore hydration is complete
    if (isLoading) return;

    const currentUserId = user?.id ?? null;

    // Clear chat history whenever the active user changes (logout, or
    // a different account signs in) so messages never leak between sessions
    if (prevUserIdRef.current !== currentUserId) {
      clearMessages();
      prevUserIdRef.current = currentUserId;
    }

    const inAuth = segments[0] === "(auth)";
    const inOnboarding = segments[0] === "onboarding";

    if (!user) {
      // Not authenticated → sign-in
      if (!inAuth) router.replace("/(auth)/sign-in");
    } else if (!user.onboarding_completed) {
      // Authenticated but hasn't finished onboarding.
      // inAuth is allowed — sign-up lives in (auth)/ and must complete
      // all profile steps before navigating to /onboarding itself.
      if (!inOnboarding && !inAuth) router.replace("/onboarding");
    } else {
      // Fully authenticated and onboarded → main app
      if (inAuth || inOnboarding) router.replace("/(tabs)");
    }
  }, [user, isLoading, segments]);

  return null;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AuthProvider>
      <ChatProvider>
        <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
          <NavigationGuard />
          <Stack screenOptions={{ headerShown: false }} />
          <StatusBar style="auto" />
        </ThemeProvider>
      </ChatProvider>
    </AuthProvider>
  );
}
