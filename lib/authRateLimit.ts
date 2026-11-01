/**
 * PULSE — Client-side rate limiting for sign-in attempts.
 *
 * Provides a sliding-window rate limiter used to throttle repeated sign-in
 * attempts per device and per email before they reach Supabase Auth.
 *
 * Fail-open: if anything unexpected happens, the limiter allows the request
 * so legitimate users are never locked out by a client-side bug.
 *
 * Limits are enforced per-app-session (in-memory). They reset when the app
 * is closed/reopened. Combined with Supabase Auth's server-side rate limits
 * (per IP + per email) and Cloudflare WAF rules, this forms defense-in-depth.
 */

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

  /** Returns the remaining seconds until the key's window resets, or 0. */
  remainingSeconds(key: string): number {
    try {
      const now = Date.now();
      const cutoff = now - this.windowSecs * 1000;
      const entries = this.windows.get(key) ?? [];
      const recent = entries.filter((e) => e.timestamp > cutoff);
      if (recent.length === 0) return 0;
      const oldest = Math.min(...recent.map((e) => e.timestamp));
      const resetAt = oldest + this.windowSecs * 1000;
      return Math.max(0, Math.ceil((resetAt - now) / 1000));
    } catch {
      return 0;
    }
  }
}

/** Default limits (tunable). Matches the spirit of Supabase Auth dashboard
 *  settings (signin max 10/hr per IP, 5/hr per email) but stricter on the
 *  client to prevent abuse before it reaches Supabase. */
export const SIGNIN_RATE_LIMIT_PER_DEVICE = 5;
export const SIGNIN_RATE_LIMIT_PER_EMAIL = 5;
export const SIGNIN_RATE_LIMIT_WINDOW_SECS = 15 * 60; // 15 minutes
export const SIGNIN_FAILURE_BACKOFF_SECS = 10; // extra cooldown per failure

/** Singleton limiters (one instance per app session). */
const deviceLimiter = new SlidingWindowLimiter(
  SIGNIN_RATE_LIMIT_PER_DEVICE,
  SIGNIN_RATE_LIMIT_WINDOW_SECS,
);
const emailLimiter = new SlidingWindowLimiter(
  SIGNIN_RATE_LIMIT_PER_EMAIL,
  SIGNIN_RATE_LIMIT_WINDOW_SECS,
);

/** Tracks consecutive failures per email for progressive backoff. */
const failureCounts = new Map<string, number>();

/** Result of a rate-limit check. */
export type RateLimitResult = {
  allowed: boolean;
  /** Seconds remaining until the limiter resets (0 when allowed). */
  remainingSeconds: number;
  /** Human-readable reason when not allowed. */
  reason?: "device" | "email";
};

/**
 * Checks whether a sign-in attempt is allowed for the given device + email.
 * Increments the attempt counter when allowed. Returns a RateLimitResult.
 *
 * Call this BEFORE supabase.auth.signInWithPassword(). On failure, call
 * `recordFailure(email)` to apply progressive backoff. On success, call
 * `reset(email)` to clear counters.
 */
export function checkSignInRateLimit(
  deviceId: string,
  email: string,
): RateLimitResult {
  const normalizedEmail = email.trim().toLowerCase();

  const deviceAllowed = deviceLimiter.check(deviceId || "unknown");
  const emailAllowed = emailLimiter.check(normalizedEmail);

  if (!deviceAllowed) {
    return {
      allowed: false,
      remainingSeconds: deviceLimiter.remainingSeconds(
        deviceId || "unknown",
      ),
      reason: "device",
    };
  }
  if (!emailAllowed) {
    return {
      allowed: false,
      remainingSeconds: emailLimiter.remainingSeconds(normalizedEmail),
      reason: "email",
    };
  }

  // Progressive backoff: if there have been recent failures for this email,
  // add an extra cooldown.
  const failures = failureCounts.get(normalizedEmail) ?? 0;
  if (failures > 0) {
    const backoffUntilMs =
      (failureCounts.get(`${normalizedEmail}:lastFailure`) ?? 0) +
      failures * SIGNIN_FAILURE_BACKOFF_SECS * 1000;
    const now = Date.now();
    if (now < backoffUntilMs) {
      return {
        allowed: false,
        remainingSeconds: Math.ceil((backoffUntilMs - now) / 1000),
        reason: "email",
      };
    }
  }

  return { allowed: true, remainingSeconds: 0 };
}

/** Records a failed sign-in attempt for the given email, applying
 * progressive backoff on subsequent failures. */
export function recordSignInFailure(email: string): void {
  const normalizedEmail = email.trim().toLowerCase();
  const count = (failureCounts.get(normalizedEmail) ?? 0) + 1;
  failureCounts.set(normalizedEmail, count);
  failureCounts.set(`${normalizedEmail}:lastFailure`, Date.now());
}

/** Resets all rate-limit counters for the given email (called on success). */
export function resetSignInRateLimit(email: string): void {
  const normalizedEmail = email.trim().toLowerCase();
  failureCounts.delete(normalizedEmail);
  failureCounts.delete(`${normalizedEmail}:lastFailure`);
}

/** Returns the remaining cooldown seconds for an email (0 if none). */
export function getSignInCooldown(email: string): number {
  const normalizedEmail = email.trim().toLowerCase();
  const failures = failureCounts.get(normalizedEmail) ?? 0;
  if (failures === 0) return 0;
  const backoffUntilMs =
    (failureCounts.get(`${normalizedEmail}:lastFailure`) ?? 0) +
    failures * SIGNIN_FAILURE_BACKOFF_SECS * 1000;
  return Math.max(0, Math.ceil((backoffUntilMs - Date.now()) / 1000));
}