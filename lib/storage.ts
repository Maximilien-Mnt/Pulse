import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

/**
 * Thin wrapper around expo-secure-store that exposes the same
 * getItem / setItem / removeItem signature that supabase-js
 * expects for `auth.storage`.
 *
 * Falls back to in-memory Map on web where SecureStore is unavailable.
 */

const webStorage = new Map<string, string>();

export const secureStorage = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === "web") {
      return webStorage.get(key) ?? null;
    }
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },

  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === "web") {
      webStorage.set(key, value);
      return;
    }
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      // silently fail – SecureStore may throw on some simulators
    }
  },

  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === "web") {
      webStorage.delete(key);
      return;
    }
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // silently fail
    }
  },
};