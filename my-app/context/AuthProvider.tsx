/**
 * context/AuthProvider.tsx — Authentication Context
 *
 * Responsibilities:
 *   - Persists token + user to expo-secure-store so sessions survive app restarts
 *   - Exposes auth state (user, token, isLoading) to the whole app
 *   - Provides login / register / logout / markOnboardingComplete actions
 *
 * Navigation after auth actions is handled by NavigationGuard in
 * app/_layout.tsx, which watches user state and redirects accordingly.
 * The only explicit redirect here is logout() → sign-in (intentional action).
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as SecureStore from "expo-secure-store";
import type { AuthContextType, User } from "@/types/auth";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const [token, setToken] = useState<string | null>(null);
  // isLoading is true until SecureStore has been read — used by NavigationGuard
  // to avoid redirecting before we know the auth state
  const [isLoading, setIsLoading] = useState(true);

  // On mount: hydrate auth state from secure storage
  useEffect(() => {
    (async () => {
      try {
        const savedToken = await SecureStore.getItemAsync("token");
        const savedUser = await SecureStore.getItemAsync("user");
        if (savedToken) setToken(savedToken);
        if (savedUser) setUser(JSON.parse(savedUser));
      } catch {
        // Corrupted storage — wipe and start fresh
        await SecureStore.deleteItemAsync("token").catch(() => {});
        await SecureStore.deleteItemAsync("user").catch(() => {});
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  /**
   * login() — called after a successful sign-in.
   * Persists credentials and updates state. NavigationGuard
   * detects the user change and redirects to the right screen.
   */
  const login = useCallback(async (newToken: string, newUser: NonNullable<User>) => {
    setToken(newToken);
    setUser(newUser);
    await SecureStore.setItemAsync("token", newToken);
    await SecureStore.setItemAsync("user", JSON.stringify(newUser));
    // NavigationGuard handles the redirect — no explicit router.replace here
  }, []);

  /**
   * register() — called at step 0 of sign-up after the account is created.
   * Does NOT redirect — the user continues filling their profile in the same flow.
   */
  const register = useCallback(async (newToken: string, newUser: NonNullable<User>) => {
    setToken(newToken);
    setUser(newUser);
    await SecureStore.setItemAsync("token", newToken);
    await SecureStore.setItemAsync("user", JSON.stringify(newUser));
  }, []);

  /**
   * markOnboardingComplete() — called when the user finishes the onboarding chat.
   * Updates the local user object so NavigationGuard redirects to (tabs).
   */
  const markOnboardingComplete = useCallback(async () => {
    if (!user) return;
    const updated = { ...user, onboarding_completed: true };
    setUser(updated);
    await SecureStore.setItemAsync("user", JSON.stringify(updated));
  }, [user]);

  /**
   * logout() — clears all credentials. NavigationGuard handles the redirect.
   */
  const logout = useCallback(async () => {
    setToken(null);
    setUser(null);
    await SecureStore.deleteItemAsync("token");
    await SecureStore.deleteItemAsync("user");
    // NavigationGuard detects user === null and redirects to sign-in
  }, []);

  const value = useMemo(
    () => ({ user, token, isLoading, login, register, markOnboardingComplete, logout }),
    [user, token, isLoading, login, register, markOnboardingComplete, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
