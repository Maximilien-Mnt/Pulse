// --- Encoding helpers ---

export function encodeText(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

export function decodeText(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}


// --- Binary helpers ---

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// --- Constants ---

const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const KEY_LENGTH = 256;
const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_HASH = "SHA-256" as const;

// --- Random generation ---

export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
}

export function generateIv(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(IV_LENGTH));
}

// --- Key derivation (deterministic) ---

export async function deriveKey(
  password: string,
  salt: Uint8Array,
  iterations: number = PBKDF2_ITERATIONS,
): Promise<CryptoKey> {
  const passwordKey = await crypto.subtle.importKey(
    "raw",
    encodeText(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations, hash: PBKDF2_HASH },
    passwordKey,
    { name: "AES-GCM", length: KEY_LENGTH },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function generateKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: "AES-GCM", length: KEY_LENGTH },
    true,
    ["encrypt", "decrypt"],
  );
}

export async function exportKeyBytes(key: CryptoKey): Promise<Uint8Array> {
  const buffer = await crypto.subtle.exportKey("raw", key);
  return new Uint8Array(buffer);
}

export async function importKeyBytes(
  keyBytes: Uint8Array,
): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "AES-GCM", length: KEY_LENGTH },
    true,
    ["encrypt", "decrypt"],
  );
}

// --- Encryption / decryption with a specific key ---

export interface EncryptedBlob {
  ciphertext: string;
  iv: string;
}

export async function encrypt(
  plaintext: string,
  key: CryptoKey,
): Promise<EncryptedBlob> {
  const iv = generateIv();
  const data = encodeText(plaintext);
  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    data,
  );
  return {
    ciphertext: bytesToBase64(new Uint8Array(ciphertextBuffer)),
    iv: bytesToBase64(iv),
  };
}

export async function decrypt(
  blob: EncryptedBlob,
  key: CryptoKey,
): Promise<string> {
  const ciphertextBytes = base64ToBytes(blob.ciphertext);
  const ivBytes = base64ToBytes(blob.iv);
  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: ivBytes },
    key,
    ciphertextBytes,
  );
  return decodeText(new Uint8Array(decryptedBuffer));
}

// --- High-level password-based encryption / decryption ---

export interface EncryptedPasswordBundle extends EncryptedBlob {
  salt: string;
  iterations: number;
}

export async function encryptWithPassword(
  plaintext: string,
  password: string,
  iterations: number = PBKDF2_ITERATIONS,
): Promise<EncryptedPasswordBundle> {
  const salt = generateSalt();
  const key = await deriveKey(password, salt, iterations);
  const blob = await encrypt(plaintext, key);
  return {
    ...blob,
    salt: bytesToBase64(salt),
    iterations,
  };
}

export async function decryptWithPassword(
  bundle: EncryptedPasswordBundle,
  password: string,
): Promise<string> {
  const salt = base64ToBytes(bundle.salt);
  const key = await deriveKey(password, salt, bundle.iterations);
  return decrypt(bundle, key);
}
