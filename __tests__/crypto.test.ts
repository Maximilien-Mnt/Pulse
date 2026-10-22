import {
  describe,
  it,
  expect,
} from "@jest/globals";
import {
  generateSalt,
  generateIv,
  encodeText,
  decodeText,
  bytesToBase64,
  base64ToBytes,
  deriveKey,
  generateKey,
  encrypt,
  decrypt,
  encryptWithPassword,
  decryptWithPassword,
  importKeyBytes,
  exportKeyBytes,
} from "@/lib/crypto";

describe("crypto utilities", () => {
  describe("encodeText / decodeText", () => {
    it("encodes and decodes UTF-8 strings correctly", () => {
      const original = "Hello, world! 🌍";
      const encoded = encodeText(original);
      const decoded = decodeText(encoded);
      expect(decoded).toBe(original);
    });

    it("handles empty strings", () => {
      expect(decodeText(encodeText(""))).toBe("");
    });

    it("handles unicode characters", () => {
      const original = "こんにちは世界 🌏";
      expect(decodeText(encodeText(original))).toBe(original);
    });
  });

  describe("bytesToBase64 / base64ToBytes", () => {
    it("encodes and decodes binary data correctly", () => {
      const original = new Uint8Array([0, 1, 2, 3, 255, 128, 64, 32]);
      const encoded = bytesToBase64(original);
      const decoded = base64ToBytes(encoded);
      expect(decoded).toEqual(original);
    });

    it("handles empty input", () => {
      const result = base64ToBytes("");
      expect(result.length).toBe(0);
    });
  });

  describe("generateSalt", () => {
    it("generates 16 random bytes", () => {
      const salt = generateSalt();
      expect(salt.length).toBe(16);
    });

    it("generates different salts on each call", () => {
      const salt1 = generateSalt();
      const salt2 = generateSalt();
      expect(salt1).not.toEqual(salt2);
    });
  });

  describe("generateIv", () => {
    it("generates 12 random bytes", () => {
      const iv = generateIv();
      expect(iv.length).toBe(12);
    });

    it("generates different IVs on each call", () => {
      const iv1 = generateIv();
      const iv2 = generateIv();
      expect(iv1).not.toEqual(iv2);
    });
  });

  describe("deriveKey", () => {
    it("derives the same key from the same password and salt", async () => {
      const password = "test-password";
      const salt = generateSalt();

      const key1 = await deriveKey(password, salt);
      const key2 = await deriveKey(password, salt);

      expect(key1).toBeDefined();
      expect(key2).toBeDefined();
    });

    it("derives different keys for different salts", async () => {
      const password = "test-password";
      const salt1 = generateSalt();
      const salt2 = generateSalt();

      const key1 = await deriveKey(password, salt1);
      const key2 = await deriveKey(password, salt2);

      expect(key1).toBeDefined();
      expect(key2).toBeDefined();
    });
  });

  describe("generateKey", () => {
    it("generates a key", async () => {
      const key = await generateKey();
      expect(key).toBeDefined();
    });
  });

  describe("importKeyBytes / exportKeyBytes", () => {
    it("imports and exports a key correctly", async () => {
      const key = await generateKey();
      const exported = await exportKeyBytes(key);
      expect(exported.length).toBe(32);

      const imported = await importKeyBytes(exported);
      expect(imported).toBeDefined();
    });
  });

  describe("encrypt / decrypt (AES-GCM)", () => {
    it("encrypts and decrypts a string correctly", async () => {
      const key = await generateKey();
      const plaintext = "Hello, world!";

      const encrypted = await encrypt(plaintext, key);
      const decrypted = await decrypt(encrypted, key);

      expect(decrypted).toBe(plaintext);
    });

    it("produces different ciphertexts for the same plaintext (random IV)", async () => {
      const key = await generateKey();
      const plaintext = "Same plaintext";

      const encrypted1 = await encrypt(plaintext, key);
      const encrypted2 = await encrypt(plaintext, key);

      expect(encrypted1).not.toEqual(encrypted2);
    });

    it("throws on wrong key", async () => {
      const key1 = await generateKey();
      const key2 = await generateKey();
      const plaintext = "Secret message";

      const encrypted = await encrypt(plaintext, key1);

      await expect(decrypt(encrypted, key2)).rejects.toThrow();
    });
  });

  describe("encryptWithPassword / decryptWithPassword", () => {
    it("encrypts and decrypts a string with a password", async () => {
      const password = "my-secret-password";
      const plaintext = "Hello, secure world!";

      const encrypted = await encryptWithPassword(plaintext, password);
      const decrypted = await decryptWithPassword(encrypted, password);

      expect(decrypted).toBe(plaintext);
    });

    it("rejects wrong password", async () => {
      const password1 = "correct-password";
      const password2 = "wrong-password";
      const plaintext = "Secret message";

      const encrypted = await encryptWithPassword(plaintext, password1);

      await expect(decryptWithPassword(encrypted, password2)).rejects.toThrow();
    });

    it("produces different ciphertexts for the same plaintext (random salt)", async () => {
      const password = "my-password";
      const plaintext = "Same plaintext";

      const encrypted1 = await encryptWithPassword(plaintext, password);
      const encrypted2 = await encryptWithPassword(plaintext, password);

      expect(encrypted1).not.toEqual(encrypted2);
    });
  });
});
