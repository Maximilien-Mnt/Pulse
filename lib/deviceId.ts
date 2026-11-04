/**
 * PULSE — Device / installation fingerprint for bot protection.
 *
 * Generates a stable per-install identifier that survives app restarts but
 * resets on reinstall. It is combined with device attributes (platform, model,
 * OS version, app build) to form a hashed fingerprint sent with auth-related
 * requests so the backend can rate-limit per device as well as per IP.
 *
 * The fingerprint itself is never reverse-engineerable to a user: it is a
 * SHA-256 hash of non-sensitive device attributes + a random installation ID
 * stored in SecureStore.
 */

import * as SecureStore from "expo-secure-store";
import { Application } from "expo-application";
import { Device } from "expo-device";
import { Platform } from "react-native";
import { randomUUID, digest } from "expo-crypto";

const INSTALL_ID_KEY = "pulse:installation_id";

let _installationId: string | null = null;

/** Persisted random installation ID (created once per install). */
async function getInstallationId(): Promise<string> {
  if (_installationId) return _installationId;
  try {
    const existing = await SecureStore.getItemAsync(INSTALL_ID_KEY);
    if (existing) {
      _installationId = existing;
      return _installationId;
    }
  } catch {
    // SecureStore unavailable (e.g. some web configs) — fall back below.
  }

  // expo-crypto.randomUUID est disponible sur natif (Hermes inclus) et web.
  const generated = `${Platform.OS}-${randomUUID()}`;
  try {
    await SecureStore.setItemAsync(INSTALL_ID_KEY, generated);
  } catch {
    // ignore: fingerprint will be regenerated each session on web fallback
  }
  _installationId = generated;
  return _installationId;
}

/** SHA-256 digest hex string (via expo-crypto, compatible Hermes). */
async function sha256Hex(input: string): Promise<string> {
  const buf = await digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Stable device fingerprint: SHA-256(platform + modelId + osVersion +
 * appId + buildVersion + installationId).
 *
 * Uses the public Expo APIs (Application.applicationId, Device.modelId,
 * Device.osVersion, ...) instead of the internal *NativeModule symbols.
 */
export async function getDeviceFingerprint(): Promise<string | null> {
  const installationId = await getInstallationId();
  const parts = [
    Platform.OS ?? "unknown",
    Device?.modelId ?? "unknown",
    Device?.osVersion ?? "unknown",
    Application?.applicationId ?? "unknown",
    Application?.buildVersion ?? "unknown",
    installationId,
  ];

  return sha256Hex(parts.join("|"));
}

/** Short device id (installation id) for logging / headers. */
export async function getDeviceId(): Promise<string> {
  return getInstallationId();
}

/** Clear stored installation id (testing / logout). */
export async function resetDeviceId(): Promise<void> {
  _installationId = null;
  try {
    await SecureStore.deleteItemAsync(INSTALL_ID_KEY);
  } catch {
    // ignore
  }
}
