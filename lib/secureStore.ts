// ---------------------------------------------------------------------------
// PULSE — LargeSecureStore
//
// Chiffrement de session "hors limite" : la clé AES-256 est générée une fois
// et gardée dans expo-secure-store (coffre natif, pas de limite 2 Ko). Les
// valeurs (JWT + refresh token) sont chiffrées AES-GCM et le ciphertext
// résultant est stocké dans AsyncStorage (mobile) / localStorage (web).
//
// Cela permet de contourner la limite de 2048 octets d'expo-secure-store tout
// en gardant le matériel cryptographique hors du stockage en clair.
// ---------------------------------------------------------------------------

import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import {
  base64ToBytes,
  bytesToBase64,
  decrypt,
  encrypt,
  exportKeyBytes,
  generateKey,
  importKeyBytes,
} from "@/lib/crypto";

const AES_KEY_STORE_KEY = "pulse:large_secure_store:aes_key";

// Référence lazy à AsyncStorage (évite les soucis de bundler en top-level).
let AsyncStorageModule: {
  getItem: (k: string) => Promise<string | null>;
  setItem: (k: string, v: string) => Promise<void>;
  removeItem: (k: string) => Promise<void>;
} | null = null;

async function getAsyncStorage() {
  if (AsyncStorageModule) return AsyncStorageModule;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("@react-native-async-storage/async-storage");
    AsyncStorageModule = (mod.default ?? mod) as {
      getItem: (k: string) => Promise<string | null>;
      setItem: (k: string, v: string) => Promise<void>;
      removeItem: (k: string) => Promise<void>;
    };
    return AsyncStorageModule;
  } catch {
    return null;
  }
}

/** Clé AES-256 persistée dans expo-secure-store (mémorisée en RAM). */
let _aesKey: CryptoKey | null = null;

async function getAesKey(): Promise<CryptoKey> {
  if (_aesKey) return _aesKey;

  const existing = await SecureStore.getItemAsync(AES_KEY_STORE_KEY);
  if (existing) {
    try {
      _aesKey = await importKeyBytes(base64ToBytes(existing));
      return _aesKey;
    } catch {
      // Clé corrompue : on en génère une nouvelle ci-dessous.
    }
  }

  const generated = await generateKey();
  const raw = await exportKeyBytes(generated);
  try {
    await SecureStore.setItemAsync(AES_KEY_STORE_KEY, bytesToBase64(raw));
  } catch {
    // SecureStore indisponible : la clé ne sera pas persistée, les sessions
    // ne survivront pas au redémarrage (dégradation gracieuse).
  }
  _aesKey = generated;
  return _aesKey;
}

/** Lecture brute (en clair) depuis le stockage sous-jacent. */
async function readRaw(key: string): Promise<string | null> {
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
}

/** Écriture brute (en clair) dans le stockage sous-jacent. */
async function writeRaw(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    try {
      localStorage.setItem(key, value);
    } catch {
      // silencieux
    }
    return;
  }
  const storage = await getAsyncStorage();
  if (storage) {
    try {
      await storage.setItem(key, value);
    } catch {
      // silencieux
    }
  }
}

/** Suppression brute dans le stockage sous-jacent. */
async function removeRaw(key: string): Promise<void> {
  if (Platform.OS === "web") {
    try {
      localStorage.removeItem(key);
    } catch {
      // silencieux
    }
    return;
  }
  const storage = await getAsyncStorage();
  if (storage) {
    try {
      await storage.removeItem(key);
    } catch {
      // silencieux
    }
  }
}

/**
 * Pack / unpack du ciphertext + IV stockés sous-jacentement.
 * Format : JSON { ciphertext, iv } (tous deux base64).
 */
function pack(iv: string, ciphertext: string): string {
  return JSON.stringify({ iv, ciphertext });
}

function unpack(packed: string): { iv: string; ciphertext: string } | null {
  try {
    const parsed = JSON.parse(packed) as {
      iv?: string;
      ciphertext?: string;
    };
    if (!parsed.iv || !parsed.ciphertext) return null;
    return { iv: parsed.iv, ciphertext: parsed.ciphertext };
  } catch {
    return null;
  }
}

/**
 * Stockage chiffré "large" compatible avec la signature
 * `getItem / setItem / removeItem` attendue par supabase-js (`auth.storage`).
 *
 * - setItem : chiffre `value` (AES-GCM, IV aléatoire) avec la clé SecureStore,
 *   stocke le ciphertext (+ IV) dans AsyncStorage/localStorage.
 * - getItem : lit le ciphertext, le déchiffre, retourne le clair.
 * - removeItem : supprime l'entrée.
 */
export const largeSecureStore = {
  getItem: async (key: string): Promise<string | null> => {
    const packed = await readRaw(key);
    if (!packed) return null;
    const blob = unpack(packed);
    if (!blob) return null;
    try {
      const aesKey = await getAesKey();
      return await decrypt(blob, aesKey);
    } catch {
      return null;
    }
  },

  setItem: async (key: string, value: string): Promise<void> => {
    const aesKey = await getAesKey();
    const blob = await encrypt(value, aesKey);
    await writeRaw(key, pack(blob.iv, blob.ciphertext));
  },

  removeItem: async (key: string): Promise<void> => {
    await removeRaw(key);
  },
};
