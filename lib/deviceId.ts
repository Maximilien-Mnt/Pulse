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
import { ApplicationNativeModule, Platform } from "expo-application";
import { DeviceNativeModule } from "expo-device";

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

  const generated = `${Platform.OS}-${crypto.randomUUID?.() ?? Date.now().toString(36)}`;
  try {
    await SecureStore.setItemAsync(INSTALL_ID_KEY, generated);
  } catch {
    // ignore: fingerprint will be regenerated each session on web fallback
  }
  _installationId = generated;
  return _installationId;
}

/** SHA-256 digest hex string. */
async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Stable device fingerprint: SHA-256(platform + modelId + osVersion +
 * appId + buildVersion + installationId).
 *
 * Returns null on platforms where crypto.subtle is unavailable.
 */
export async function getDeviceFingerprint(): Promise<string | null> {
  if (!crypto.subtle) return null;

  const installationId = await getInstallationId();
  const parts = [
    Platform.OS ?? "unknown",
    DeviceNativeModule?.modelId ?? "unknown",
    DeviceNativeModule?.osVersion ?? "unknown",
    ApplicationNativeModule?.applicationId ?? "unknown",
    ApplicationNativeModule?.buildVersion ?? "unknown",
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
