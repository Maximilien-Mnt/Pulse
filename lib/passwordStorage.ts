import { Platform } from "react-native";
import { logger } from "@/lib/reporting/logger";

/**
 * SECURITY NOTE — READ BEFORE USING
 *
 * This module stores the user's **plaintext password** so it can be shown
 * again in Settings → Sécurité. That is an intentional anti-pattern kept only
 * for native, where expo-secure-store maps to the OS keychain / keystore.
 *
 * WEB IS REFUSED ON PURPOSE. On web there is no SecureStore, so the previous
 * implementation fell back to AsyncStorage / localStorage — i.e. a reversible
 * copy of the user's real password sitting in localStorage, readable by any
 * injected script (see public/_headers CSP) and by anyone with access to the
 * browser profile. That password is very likely reused on other sites, so the
 * blast radius extends well beyond Pulse.
 *
 * `setStoredPassword` returns false and `getStoredPassword` returns null on
 * web, so the "view my password" affordance degrades to "not available on web"
 * rather than silently persisting a credential. Callers already handle a null
 * read; they must also handle a false write.
 *
 * TODO(product): remove this feature entirely and replace it with a password
 * strength / last-changed indicator plus the existing change-password flow
 * (hooks/useChangePassword.ts). Reversible credential storage has no
 * legitimate product need.
 *
 * Legacy keys written to AsyncStorage as `user_password_${userId}` are
 * migrated into SecureStore on first read so no plaintext password is left in
 * AsyncStorage going forward.
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
 *
 * On native, prefers SecureStore and migrates any legacy AsyncStorage entry
 * into SecureStore on first access. On web, always returns null: there is no
 * secure store available and a plaintext password must never be persisted.
 */
export async function getStoredPassword(
  userId: string | null | undefined
): Promise<string | null> {
  if (!userId) return null;

  // Web has no SecureStore. Do not read a plaintext password out of
  // AsyncStorage/localStorage, and remove any legacy copy left there by an
  // older app version so it cannot linger.
  if (Platform.OS === "web") {
    await purgeLegacyWebCopy(userId);
    return null;
  }

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

  // 2. Fall back to AsyncStorage (legacy / previously stored data only).
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
 * Persist the password for a user. Writes to SecureStore on native only.
 *
 * Returns false on web (and on any platform without a usable store) so callers
 * can surface "not available" instead of assuming the password was saved.
 */
export async function setStoredPassword(
  userId: string | null | undefined,
  password: string
): Promise<boolean> {
  if (!userId) return false;

  if (Platform.OS === "web") {
    logger.debug(
      "passwordStorage",
      "Refusing to store a plaintext password on web (no secure store available)."
    );
    await purgeLegacyWebCopy(userId);
    return false;
  }

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

    return false;
  } catch (error) {
    // Never log the password itself; only the fact that the write failed.
    logger.error("passwordStorage", "Failed to store password securely.", {
      error,
    });
    return false;
  }
}

/**
 * Delete any plaintext password copy left in web storage by an older app
 * version. Best-effort: a failure here is non-critical because the web path
 * never reads these keys any more.
 */
async function purgeLegacyWebCopy(userId: string): Promise<void> {
  const storage = await getAsyncStorage();
  if (!storage) return;
  for (const key of [secureKey(userId), legacyKey(userId)]) {
    try {
      await storage.removeItem(key);
    } catch {
      // ignore
    }
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