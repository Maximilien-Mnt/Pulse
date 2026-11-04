import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { sessionStorage, secureStorage } from "@/lib/storage";
import { largeSecureStore } from "@/lib/secureStore";
import AsyncStorage from "@react-native-async-storage/async-storage";

// --- Mock largeSecureStore (teste le comportement de stockage, pas le chiffrement) ---
const mockEncryptedMap = new Map<string, string>();
jest.mock("@/lib/secureStore", () => ({
  largeSecureStore: {
    getItem: jest.fn(async (key: string) => mockEncryptedMap.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      mockEncryptedMap.set(key, value);
    }),
    removeItem: jest.fn(async (key: string) => {
      mockEncryptedMap.delete(key);
    }),
  },
}) as any);

beforeEach(() => {
  mockEncryptedMap.clear();
});

describe("sessionStorage (migration legacy + chiffrement)", () => {
  it("migrate une entrée legacy en clair vers le chiffré", async () => {
    // Aucun entrée chiffrée, mais du legacy en clair dans AsyncStorage.
    await AsyncStorage.setItem("legacy-key", "plaintext-token");

    const val = await sessionStorage.getItem("legacy-key");
    expect(val).toBe("plaintext-token");

    // Le legacy doit avoir été ré-chiffré et l'entrée en clair purgée.
    const legacyStillThere = await AsyncStorage.getItem("legacy-key");
    expect(legacyStillThere).toBeNull();
    const encrypted = await largeSecureStore.getItem("legacy-key");
    expect(encrypted).toBe("plaintext-token");
  });

  it("setItem écrit chiffré et purge le legacy", async () => {
    await AsyncStorage.setItem("key2", "old-plaintext");
    await sessionStorage.setItem("key2", "new-value");

    const legacy = await AsyncStorage.getItem("key2");
    expect(legacy).toBeNull();
    const encrypted = await largeSecureStore.getItem("key2");
    expect(encrypted).toBe("new-value");
  });

  it("removeItem supprime chiffré et legacy", async () => {
    await AsyncStorage.setItem("key3", "legacy-plaintext");
    mockEncryptedMap.set("key3", "encrypted-value");
    await sessionStorage.removeItem("key3");

    expect(await AsyncStorage.getItem("key3")).toBeNull();
    expect(await largeSecureStore.getItem("key3")).toBeNull();
  });

  it("getItem retourne null quand aucune entrée ni legacy ni chiffrée", async () => {
    const val = await sessionStorage.getItem("nonexistent");
    expect(val).toBeNull();
  });

  it("secureStorage est un alias de sessionStorage (rétro-compat)", async () => {
    expect(secureStorage).toBe(sessionStorage);
  });
});
