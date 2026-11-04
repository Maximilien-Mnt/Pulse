import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { largeSecureStore } from "@/lib/secureStore";
import AsyncStorage from "@react-native-async-storage/async-storage";

// --- Mock expo-secure-store (coffre natif, pas dispo dans jsdom) ---
const mockSecureStoreMap = new Map<string, string>();
jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(async (key: string) => mockSecureStoreMap.get(key) ?? null),
  setItemAsync: jest.fn(async (_key: string, value: string) => {
    mockSecureStoreMap.set(_key, value);
  }),
  deleteItemAsync: jest.fn(async (key: string) => {
    mockSecureStoreMap.delete(key);
  }),
}) as any);

beforeEach(() => {
  mockSecureStoreMap.clear();
});

describe("largeSecureStore (chiffrement AES-GCM + stockage ciphertext)", () => {
  it("chiffre puis déchiffre une valeur correctement", async () => {
    await largeSecureStore.setItem("session", "access-token-123");
    const value = await largeSecureStore.getItem("session");
    expect(value).toBe("access-token-123");
  });

  it("retourne null pour une clé absente", async () => {
    const value = await largeSecureStore.getItem("aucun");
    expect(value).toBeNull();
  });

  it("supprime une entrée avec removeItem", async () => {
    await largeSecureStore.setItem("tmp", "data");
    expect(await largeSecureStore.getItem("tmp")).toBe("data");
    await largeSecureStore.removeItem("tmp");
    expect(await largeSecureStore.getItem("tmp")).toBeNull();
  });

  it("gère gracieusement un ciphertext corrompu (retourne null)", async () => {
    await AsyncStorage.setItem("corrupt", "not-valid-json");
    const value = await largeSecureStore.getItem("corrupt");
    expect(value).toBeNull();
  });

  it("déchiffre correctement un même clair stocké sous deux clés (IV aléatoire par écriture)", async () => {
    await largeSecureStore.setItem("a", "même texte");
    await largeSecureStore.setItem("b", "même texte");
    expect(await largeSecureStore.getItem("a")).toBe("même texte");
    expect(await largeSecureStore.getItem("b")).toBe("même texte");
  });
});
