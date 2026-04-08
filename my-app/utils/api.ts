/**
 * utils/api.ts — Centralized API helper with Firebase token injection
 *
 * All backend calls go through apiFetch() which automatically attaches
 * the current user's Firebase ID token as a Bearer header.
 */

import * as SecureStore from "expo-secure-store";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export async function getStoredToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync("token");
  } catch {
    return null;
  }
}

export async function apiFetch(
  path: string,
  options?: RequestInit,
): Promise<Response> {
  const token = await getStoredToken();
  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
}
