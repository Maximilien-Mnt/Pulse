import { Platform } from "react-native";

/**
 * Secure storage for the user's plaintext password so they can view it
 * again later in Settings → Sécurité.
 *
 * On iOS/Android the password is stored in the OS keychain/keystore via
 * expo-secure-store. On web (where SecureStore isn't available) we fall
 * back to AsyncStorage, mirroring lib/storage.ts.
 *
 * Legacy keys written to AsyncStorage as `user_password_${userId}` are
 * migrated into SecureStore on first read so no plaintext password is
 * left in AsyncStorage going forward.
 */

const SECURE_PREFIX = "pulse_password_";
const LEGACY_PREFIX = "user_password_";

type SecureStoreLike = {
  getItemAsync: (key: string) => Promise<string | null>;
  setItemAsync: (key: string, value: string) => Promise<void>;
  deleteItemAsync: (key: string) => Promise<void>;
};

type AsyncStorageLike = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

let secureStoreCache: SecureStoreLike | null | undefined;
async function getSecureStore(): Promise<SecureStoreLike | null> {
  if (secureStoreCache !== undefined) return secureStoreCache;
  secureStoreCache = null;
  if (Platform.OS === "web") return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("expo-secure-store");
    secureStoreCache = mod;
    return mod;
  } catch {
    return null;
  }
}

let asyncStorageCache: AsyncStorageLike | null | undefined;
async function getAsyncStorage(): Promise<AsyncStorageLike | null> {
  if (asyncStorageCache !== undefined) return asyncStorageCache;
  asyncStorageCache = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("@react-native-async-storage/async-storage");
    const storage = (mod.default ?? mod) as AsyncStorageLike;
    asyncStorageCache = storage;
    return storage;
  } catch {
    return null;
  }
}

function secureKey(userId: string): string {
  return `${SECURE_PREFIX}${userId}`;
}

function legacyKey(userId: string): string {
  return `${LEGACY_PREFIX}${userId}`;
}

/**
 * Read the stored password for a user.
 * On native, prefers SecureStore and migrates any legacy AsyncStorage
 * entry into SecureStore on first access.
 */
export async function getStoredPassword(
  userId: string | null | undefined
): Promise<string | null> {
  if (!userId) return null;

  const secureStore = await getSecureStore();

  // 1. Try SecureStore (native) — the primary location.
  if (secureStore) {
    try {
      const value = await secureStore.getItemAsync(secureKey(userId));
      if (value !== null) return value;
    } catch {
      // fall through to the AsyncStorage fallback / legacy migration
    }
  }

  // 2. Fall back to AsyncStorage (web, or legacy / previously stored data).
  const storage = await getAsyncStorage();
  if (!storage) return null;

  let secureValue: string | null = null;
  let legacyValue: string | null = null;
  try {
    secureValue = await storage.getItem(secureKey(userId));
    legacyValue = await storage.getItem(legacyKey(userId));
  } catch {
    return null;
  }

  if (secureValue !== null) return secureValue;
  if (legacyValue === null) return null;

  // 3. Migrate the legacy plaintext entry into SecureStore, then delete it.
  if (secureStore) {
    try {
      await secureStore.setItemAsync(secureKey(userId), legacyValue);
      await storage.removeItem(legacyKey(userId));
    } catch {
      // Keep the legacy value if migration fails; it will retry next time.
    }
  }

  return legacyValue;
}

/**
 * Persist the password for a user. Writes to SecureStore on native and
 * AsyncStorage on web, and removes any legacy plaintext copy.
 */
export async function setStoredPassword(
  userId: string | null | undefined,
  password: string
): Promise<boolean> {
  if (!userId) return false;

  try {
    const secureStore = await getSecureStore();
    if (secureStore) {
      await secureStore.setItemAsync(secureKey(userId), password);
      // Remove any legacy plaintext copy so it can't linger in AsyncStorage.
      const storage = await getAsyncStorage();
      if (storage) {
        try {
          await storage.removeItem(legacyKey(userId));
        } catch {
          // Non-critical cleanup failure — SecureStore is already updated.
        }
      }
      return true;
    }

    const storage = await getAsyncStorage();
    if (storage) {
      await storage.setItem(secureKey(userId), password);
      await storage.removeItem(legacyKey(userId));
      return true;
    }

    return false;
  } catch (error) {
    console.error("Failed to store password:", error);
    return false;
  }
}

/**
 * Remove any stored password for a user (both SecureStore and legacy
 * AsyncStorage keys).
 */
export async function clearStoredPassword(
  userId: string | null | undefined
): Promise<void> {
  if (!userId) return;

  const secureStore = await getSecureStore();
  if (secureStore) {
    try {
      await secureStore.deleteItemAsync(secureKey(userId));
    } catch {
      // noop
    }
  }

  const storage = await getAsyncStorage();
  if (storage) {
    try {
      await storage.removeItem(secureKey(userId));
      await storage.removeItem(legacyKey(userId));
    } catch {
      // noop
    }
  }
}