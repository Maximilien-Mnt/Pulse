// ---------------------------------------------------------------------------
// PULSE — Link helpers
//
// normalizeLink: trim + auto-prepend https:// when scheme missing.
// isValidLink: flexible URL check — any host/TLD, IP, localhost, port,
// path, query, hash. Rejects plain words / embedded spaces.
// ---------------------------------------------------------------------------

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
