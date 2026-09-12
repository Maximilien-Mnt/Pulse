// ---------------------------------------------------------------------------
// PULSE — Network-error detection
//
// Heuristic to decide whether a query failure looks like an offline /
// connectivity problem (so the UI can show the offline copy explaining that
// retry is available and no data was lost) vs a generic load failure.
// ---------------------------------------------------------------------------

const NETWORK_PATTERNS = [
  "network",
  "offline",
  "failed to fetch",
  "fetch failed",
  "load failed",
  "timeout",
  "timed out",
  "econn",
  "enotfound",
  "socket",
  "abort",
];

/** Returns true when the error looks like a connectivity failure. */
export function isNetworkError(error: unknown): boolean {
  if (!error) return false;
  const candidates: string[] = [];
  if (error instanceof Error) {
    candidates.push(error.name, error.message);
    const code = (error as { code?: unknown }).code;
    if (typeof code === "string") candidates.push(code);
  } else if (typeof error === "object") {
    const rec = error as Record<string, unknown>;
    for (const key of ["code", "message", "error", "details"]) {
      const v = rec[key];
      if (typeof v === "string") candidates.push(v);
    }
  } else if (typeof error === "string") {
    candidates.push(error);
  }
  const haystack = candidates.join(" ").toLowerCase();
  return NETWORK_PATTERNS.some((p) => haystack.includes(p));
}
