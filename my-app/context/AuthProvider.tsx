/**
 * context/AuthProvider.tsx — Authentication Context
 *
 * Responsibilities:
 *   - Persists Firebase ID token + user to expo-secure-store so sessions survive app restarts
 *   - Exposes auth state (user, token, isLoading) to the whole app
 *   - Provides login / register / logout / markOnboardingComplete actions
 *
 * Navigation after auth actions is handled by NavigationGuard in
 * app/_layout.tsx, which watches user state and redirects accordingly.
 * The only explicit redirect here is logout() → sign-in (intentional action).
 *
 * Note: Firebase ID tokens expire after 1 hour. On app rehydration, we
 * attempt to refresh the token via GET /auth/me. If it fails, we log out.
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { setItem, getItem, deleteItem } from "@/utils/storage";
import type { AuthContextType, User } from "@/types/auth";

const FIREBASE_WEB_API_KEY = process.env.EXPO_PUBLIC_FIREBASE_WEB_API_KEY ?? "";

async function refreshFirebaseToken(refreshToken: string): Promise<{ idToken: string; refreshToken: string } | null> {
  try {
    const res = await fetch(
      `https://securetoken.googleapis.com/v1/token?key=${FIREBASE_WEB_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grant_type: "refresh_token", refresh_token: refreshToken }),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return { idToken: data.id_token, refreshToken: data.refresh_token };
  } catch {
    return null;
  }
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleRefresh = useCallback((refreshToken: string) => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    // Refresh after 55 minutes (tokens expire at 60 min)
    refreshTimerRef.current = setTimeout(async () => {
      const result = await refreshFirebaseToken(refreshToken);
      if (result) {
        setToken(result.idToken);
        await setItem("token", result.idToken);
        await setItem("refresh_token", result.refreshToken);
        scheduleRefresh(result.refreshToken);
      }
    }, 55 * 60 * 1000);
  }, []);

  // On mount: hydrate auth state from secure storage
  useEffect(() => {
    (async () => {
      try {
        const savedToken = await getItem("token");
        const savedUser = await getItem("user");
        const savedRefreshToken = await getItem("refresh_token");
        if (savedToken && savedUser) {
          if (savedRefreshToken) {
            // Always refresh on relaunch — token may be expired
            const result = await refreshFirebaseToken(savedRefreshToken);
            if (result) {
              setToken(result.idToken);
              setUser(JSON.parse(savedUser));
              await setItem("token", result.idToken);
              await setItem("refresh_token", result.refreshToken);
              scheduleRefresh(result.refreshToken);
            } else {
              // Refresh token invalid/revoked — force logout
              await deleteItem("token").catch(() => {});
              await deleteItem("user").catch(() => {});
              await deleteItem("refresh_token").catch(() => {});
            }
          } else {
            // No refresh token — use saved token as-is (best effort)
            setToken(savedToken);
            setUser(JSON.parse(savedUser));
          }
        }
      } catch {
        await deleteItem("token").catch(() => {});
        await deleteItem("user").catch(() => {});
        await deleteItem("refresh_token").catch(() => {});
      } finally {
        setIsLoading(false);
      }
    })();
    return () => { if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current); };
  }, []);

  /**
   * login() — called after a successful sign-in.
   * Persists Firebase ID token and user. NavigationGuard
   * detects the user change and redirects to the right screen.
   */
  const login = useCallback(async (newToken: string, newUser: NonNullable<User>, refreshToken?: string) => {
    setToken(newToken);
    setUser(newUser);
    await setItem("token", newToken);
    await setItem("user", JSON.stringify(newUser));
    if (refreshToken) {
      await setItem("refresh_token", refreshToken);
      scheduleRefresh(refreshToken);
    }
  }, [scheduleRefresh]);

  const register = useCallback(async (newToken: string, newUser: NonNullable<User>, refreshToken?: string) => {
    setToken(newToken);
    setUser(newUser);
    await setItem("token", newToken);
    await setItem("user", JSON.stringify(newUser));
    if (refreshToken) {
      await setItem("refresh_token", refreshToken);
      scheduleRefresh(refreshToken);
    }
  }, [scheduleRefresh]);

  /**
   * markOnboardingComplete() — called when the user finishes the onboarding chat.
   * Updates the local user object so NavigationGuard redirects to (tabs).
   */
  const markOnboardingComplete = useCallback(async () => {
    if (!user) return;
    const updated = { ...user, onboarding_completed: true };
    setUser(updated);
    await setItem("user", JSON.stringify(updated));
  }, [user]);

  /**
   * logout() — clears all credentials. NavigationGuard handles the redirect.
   */
  const logout = useCallback(async () => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    setToken(null);
    setUser(null);
    await deleteItem("token");
    await deleteItem("user");
    await deleteItem("refresh_token");
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
