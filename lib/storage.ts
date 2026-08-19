import { Platform } from "react-native";

/**
 * Thin wrapper around AsyncStorage (or localStorage on web) that exposes
 * the getItem / setItem / removeItem signature supabase-js expects for
 * `auth.storage`.
 *
 * Uses AsyncStorage instead of SecureStore because Supabase session data
 * (JWT + refresh token + user metadata) easily exceeds SecureStore's
 * 2048-byte limit, which produces warnings and will throw in future SDKs.
 *
 * On web, uses localStorage to persist sessions across page reloads.
 */

// Lazy-loaded reference to avoid top-level import issues in some bundlers.
let AsyncStorageModule: { getItem: (k: string) => Promise<string | null>; setItem: (k: string, v: string) => Promise<void>; removeItem: (k: string) => Promise<void> } | null = null;
async function getAsyncStorage() {
  if (AsyncStorageModule) return AsyncStorageModule;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("@react-native-async-storage/async-storage");
    AsyncStorageModule = mod.default;
    return AsyncStorageModule;
  } catch {
    return null;
  }
}

export const secureStorage = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === "web") {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    }
    const storage = await getAsyncStorage();
    if (storage) {
      try {
        return await storage.getItem(key);
      } catch {
        return null;
      }
    }
    return null;
  },

  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === "web") {
      try {
        localStorage.setItem(key, value);
      } catch {
        // silently fail
      }
      return;
    }
    const storage = await getAsyncStorage();
    if (storage) {
      try {
        await storage.setItem(key, value);
      } catch {
        // silently fail
      }
    }
  },

  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === "web") {
      try {
        localStorage.removeItem(key);
      } catch {
        // silently fail
      }
      return;
    }
    const storage = await getAsyncStorage();
    if (storage) {
      try {
        await storage.removeItem(key);
      } catch {
        // silently fail
      }
    }
  },
};
