// ---------------------------------------------------------------------------
// PULSE — Stockage de session Supabase (chiffré)
// ---------------------------------------------------------------------------
//
// Anciennement `secureStorage` (nom trompeur : les tokens étaient stockés en
// clair dans AsyncStorage / localStorage). Le stockage utilise désormais
// `largeSecureStore` (lib/secureStore) : la clé AES-256 vit dans
// expo-secure-store et seul le ciphertext AES-GCM réside dans AsyncStorage
// (mobile) / localStorage (web), contournant ainsi la limite de 2048 octets
// d'expo-secure-store.
//
// Migration des sessions existantes :
//   - getItem tente d'abord le coffre chiffré.
//   - En cas d'absence, il tente une lecture "legacy" en clair (ancien format
//     AsyncStorage/localStorage). Si trouvée, elle est ré-chiffrée, l'entrée
//     en clair est supprimée, et la valeur est retournée.
//   - setItem / removeItem écrivent dans le coffre chiffré et suppriment toute
//     entrée legacy restante.
//
// ⚠️  Impact : toute session existante en clair est ré-chiffrée au premier
// accès, puis l'entrée en clair est purgée. Les sessions créées AVANT ce
// déploiement sont donc ré-écrites de manière transparente et conservées.
// Une session jamais ouverte après le déploiement reste en clair jusqu'à sa
// prochaine lecture (ou son expiration naturelle).
// ---------------------------------------------------------------------------

import { Platform } from "react-native";
import { largeSecureStore } from "./secureStore";

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

/** Lecture brute (en clair) depuis le stockage sous-jacent (format legacy). */
async function readLegacyRaw(key: string): Promise<string | null> {
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
async function writeLegacyRaw(key: string, value: string): Promise<void> {
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
async function removeLegacyRaw(key: string): Promise<void> {
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
 * Stockage de session compatible avec la signature `auth.storage` de
 * supabase-js. Chiffre les valeurs via `largeSecureStore` avant écriture,
 * avec migration transparente des entrées legacy en clair.
 */
export const sessionStorage = {
  getItem: async (key: string): Promise<string | null> => {
    // 1. Coffre chiffré (format actuel).
    const encrypted = await largeSecureStore.getItem(key);
    if (encrypted !== null) return encrypted;

    // 2. Fallback legacy : texte en clair (avant migration).
    const legacy = await readLegacyRaw(key);
    if (legacy !== null) {
      // Ré-chiffre et purge l'entrée en clair.
      await largeSecureStore.setItem(key, legacy);
      await removeLegacyRaw(key);
    }
    return legacy;
  },

  setItem: async (key: string, value: string): Promise<void> => {
    await largeSecureStore.setItem(key, value);
    // Purge toute entrée legacy pouvant subsister sous la même clé.
    await removeLegacyRaw(key);
  },

  removeItem: async (key: string): Promise<void> => {
    await largeSecureStore.removeItem(key);
    await removeLegacyRaw(key);
  },
};

// Rétro-compatibilité temporaire : `secureStorage` était l'ancien nom.
// À supprimer une fois tous les imports migrés vers `sessionStorage`.
export const secureStorage = sessionStorage;
