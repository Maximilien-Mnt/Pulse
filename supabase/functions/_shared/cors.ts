/**
 * Shared CORS + JSON helpers for Supabase Edge Functions.
 *
 * Policy:
 * - Public signup keeps an explicit origin allow-list (no `*`).
 * - Authenticated functions (geocode) allow the same web origins but still
 *   require a user JWT (checked inside each function).
 * - Internal/job functions (send-notification, update-user-stats,
 *   sync-external-data) send NO Access-Control-Allow-Origin so browsers
 *   cannot drive them cross-origin; they require a secret or JWT.
 */

// Production + local dev origins allowed to call public/authenticated
// functions from a browser. Extend via ALLOWED_ORIGINS env (comma-separated).
const DEFAULT_ORIGINS = [
  "http://localhost:8081",
  "http://localhost:19006",
  "https://pulse.app",
  "https://www.pulse.app",
];

export function getAllowedOrigins(): string[] {
  const extra = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return [...new Set([...DEFAULT_ORIGINS, ...extra])];
}

function resolveOrigin(req: Request): string | null {
  const origin = req.headers.get("origin");
  if (!origin) return null;
  return getAllowedOrigins().includes(origin) ? origin : null;
}

/** CORS headers for an allow-listed browser origin (empty = deny). */
export function publicCorsHeaders(req: Request): Record<string, string> {
  const origin = resolveOrigin(req);
  if (!origin) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Vary": "Origin",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
  };
}

export function jsonWithCors(
  req: Request,
  body: Record<string, unknown>,
  status = 200,
  extra: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...publicCorsHeaders(req),
      ...extra,
    },
  });
}

export function handlePreflight(req: Request): Response | null {
  if (req.method !== "OPTIONS") return null;
  return new Response("ok", { headers: { ...publicCorsHeaders(req) } });
}

/** Constant-time string comparison for shared secrets. */
export function secretsEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
