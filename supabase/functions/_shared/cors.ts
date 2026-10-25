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

// ---------------------------------------------------------------------------
// In-memory sliding-window rate limiter (per-isolate; defense-in-depth burst
// protection for the public signup edge function).
//
// Keys are strings like "ip:1.2.3.4" or "device:abc123". Each hit appends the
// current timestamp; hits older than the window are pruned. When the count
// exceeds `limit`, the request is rate-limited.
//
// Fail-open: if anything unexpected happens, allow the request (log to console).
// ---------------------------------------------------------------------------

type WindowEntry = { timestamp: number };

class SlidingWindowLimiter {
  private windows = new Map<string, WindowEntry[]>();

  constructor(
    private limit: number,
    private windowSecs: number,
  ) {}

  /** Returns true if the request is allowed, false if rate-limited. */
  check(key: string): boolean {
    try {
      const now = Date.now();
      const cutoff = now - this.windowSecs * 1000;
      const entries = this.windows.get(key) ?? [];
      const recent = entries.filter((e) => e.timestamp > cutoff);
      if (recent.length >= this.limit) {
        this.windows.set(key, recent);
        return false;
      }
      recent.push({ timestamp: now });
      this.windows.set(key, recent);
      return true;
    } catch {
      // Fail-open on any unexpected error.
      return true;
    }
  }
}

/**
 * Builds per-IP and per-device rate limiters from env vars with safe defaults.
 * Call once per isolate (module scope is fine).
 */
export function buildSignupLimiters() {
  const perIp = parseInt(Deno.env.get("SIGNUP_RATE_LIMIT_PER_IP") ?? "5", 10);
  const perDevice = parseInt(Deno.env.get("SIGNUP_RATE_LIMIT_PER_DEVICE") ?? "3", 10);
  const windowSecs = parseInt(Deno.env.get("SIGNUP_RATE_LIMIT_WINDOW_SECS") ?? "3600", 10);
  return {
    ip: new SlidingWindowLimiter(perIp > 0 ? perIp : 5, windowSecs > 0 ? windowSecs : 3600),
    device: new SlidingWindowLimiter(perDevice > 0 ? perDevice : 3, windowSecs > 0 ? windowSecs : 3600),
  };
}

/** Best-effort client IP from Cloudflare headers, falling back to "unknown". */
export function clientIp(req: Request): string {
  return (
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

/** Best-effort device id from the X-Device-Id header. */
export function deviceId(req: Request): string | null {
  return req.headers.get("x-device-id") ?? null;
}
