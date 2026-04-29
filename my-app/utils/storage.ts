/**
 * utils/storage.ts — Platform-aware secure storage
 *
 * expo-secure-store is native-only (Keychain/Keystore).
 * On web it exports an empty object, so we fall back to localStorage.
 */

import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

export async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.setItem(key, value);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
}

export async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    return localStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

export async function deleteItem(key: string): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.removeItem(key);
  } else {
    await SecureStore.deleteItemAsync(key);
  }
}
