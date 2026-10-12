// ---------------------------------------------------------------------------
// PULSE — Link helpers
//
// normalizeLink/isValidLink: form-input helpers (auto-prepend https://).
// safeHttpUrl/safeMailto/safeTel/safeDeepLinkPath/safeIdSegment:
// render-time guards — strict, never rewrite; return null for anything
// that must not reach Linking.openURL / openBrowserAsync.
// ---------------------------------------------------------------------------

/** Strict http(s) URL or null. Trims; never prepends a scheme. */
export function safeHttpUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || /\s/.test(trimmed) || trimmed.length > 2048) return null;
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  if (!parsed.hostname) return null;
  return parsed.toString();
}

/** `mailto:` for a plain address, or null. Never accepts query params. */
export function safeMailto(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || /[\s<>]/.test(trimmed)) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return null;
  return `mailto:${trimmed}`;
}

/** `tel:` for a plain phone number, or null. */
export function safeTel(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (/[\r\n<>]/.test(value)) return null;
  const trimmed = value.trim().replace(/[ .()\-]/g, "");
  if (!/^[+]?[0-9]{3,15}$/.test(trimmed)) return null;
  return `tel:${trimmed}`;
}

const SAFE_DEEP_LINK = /^(clubs|events|conversations)\/[A-Za-z0-9-]+(\/[a-z-]+)?$/;

/**
 * Validate a push-notification deep_link path (relative, no scheme/host).
 * Returns the sanitized path or null when it must not be opened.
 */
export function safeDeepLinkPath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim().replace(/^\/+/, "");
  if (!cleaned || cleaned.length > 200) return null;
  if (/[:?#\s]/.test(cleaned)) return null;
  return SAFE_DEEP_LINK.test(cleaned) ? cleaned : null;
}

/** Validate a push-notification record id segment (UUID/slug). */
export function safeIdSegment(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const text = String(value).trim();
  if (!text || text.length > 100) return null;
  return /^[A-Za-z0-9-]+$/.test(text) ? text : null;
}

export function normalizeLink(raw: string): string {
  const trimmed = raw.trim().replace(/\s+/g, "");
  if (!trimmed) return "";
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function isValidLink(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed || /\s/.test(trimmed)) return false;
  const candidate = normalizeLink(trimmed);
  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return false;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
  const host = parsed.hostname;
  if (!host) return false;
  // Allow localhost + IPv4/IPv6
  if (host === "localhost") return true;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  if (host.includes(":")) return true; // IPv6 (URL strips brackets)
  // Otherwise require a dot with a TLD of >= 2 chars (unicode-aware)
  if (!host.includes(".")) return false;
  const tld = host.split(".").pop() ?? "";
  if (tld.length < 2) return false;
  // Total length sanity (browser limit ~2048)
  if (candidate.length > 2048) return false;
  return true;
}
