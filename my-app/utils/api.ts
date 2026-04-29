/**
 * utils/api.ts — Centralized API helper with Firebase token injection
 *
 * All backend calls go through apiFetch() which automatically attaches
 * the current user's Firebase ID token as a Bearer header.
 *
 * API base URL resolution order:
 *   1. EXPO_PUBLIC_API_BASE_URL env var (explicit override, e.g. production)
 *   2. Auto-derived from Expo dev server hostUri (same IP, port 8000)
 *   3. Fallback: http://localhost:8000
 */

import Constants from "expo-constants";
import { getItem } from "./storage";

function getApiBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_BASE_URL) {
    return process.env.EXPO_PUBLIC_API_BASE_URL;
  }
  // In dev, Expo knows the machine IP via hostUri (e.g. "192.168.1.5:8081")
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(":")[0];
    return `http://${host}:8000`;
  }
  return "http://localhost:8000";
}

const API_BASE_URL = getApiBaseUrl();

export async function getStoredToken(): Promise<string | null> {
  try {
    return await getItem("token");
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
