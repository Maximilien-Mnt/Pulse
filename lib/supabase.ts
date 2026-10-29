import "react-native-url-polyfill/auto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types";
import { secureStorage } from "./storage";
import { logger } from "@/lib/reporting/logger";
import { reportError, reportPerformance } from "@/lib/reporting/errorReport";
import { redactUrl } from "@/lib/reporting/redact";
import { useAuthStore } from "@/stores/authStore";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

if (!supabaseUrl || !supabaseAnonKey) {
  logger.warn("supabase", "Missing Supabase URL or anon key. Requests will fail until env is loaded.");
}

function logSupabase(label: string, args: any[]) {
  try {
    const method = args[0];
    logger.debug("supabase", `${label}: ${String(method).slice(0, 120)}`);
  } catch {
    // ignore
  }
}

const storage = secureStorage;

export const signupEdgeFunctionUrl = `${supabaseUrl}/functions/v1/signup`;

// Lazily resolved device id so every outgoing Supabase request carries
// X-Device-Id without blocking the first request. Resolves on first use.
let _deviceIdPromise: Promise<string> | null = null;

// Guards against re-entrant 401 recovery (e.g. sign-out itself triggering
// further requests that also return 401).
let _recoveringFrom401 = false;

async function handle401Recovery() {
  if (_recoveringFrom401) return;
  _recoveringFrom401 = true;
  try {
    // Clear the Supabase session (access + refresh tokens) so subsequent
    // requests stop carrying a stale/invalid JWT.
    await supabase.auth.signOut({ scope: "global" });
  } catch {
    // Best-effort: even if sign-out fails, clear the local store so the
    // AuthGuard can redirect to sign-in.
  } finally {
    const { setUserId, setInitialized } = useAuthStore.getState();
    setUserId(null);
    setInitialized(false);
    _recoveringFrom401 = false;
  }
}
function getCachedDeviceId(): Promise<string> {
  if (!_deviceIdPromise) {
    _deviceIdPromise = (async () => {
      try {
        return await (await import("./deviceId")).getDeviceId();
      } catch {
        return "";
      }
    })();
  }
  return _deviceIdPromise;
}

export const supabase: SupabaseClient<Database> = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      storage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
    global: {
      fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
        const safeUrl = redactUrl(url);
        const start = Date.now();
        try {
          logSupabase("REQUEST", [safeUrl, init?.method ?? "GET"]);
          const deviceId = await getCachedDeviceId();
          const modifiedInit: RequestInit = {
            ...init,
            headers: {
              ...(init?.headers ?? {}),
              ...(deviceId ? { "X-Device-Id": deviceId } : {}),
            },
          };
          const res = await fetch(input, modifiedInit);
          const duration = Date.now() - start;
          if (!res.ok) {
            // Never log response bodies: they may contain user-generated content.
            logger.warn("supabase", `request failed: ${res.status} ${safeUrl} (${duration}ms)`);
            // A 401 means the access token is missing/expired and cannot be
            // refreshed — recover by signing out and clearing the local auth
            // store so AuthGuard redirects to sign-in instead of being stuck
            // with every Supabase request returning 401.
            if (res.status === 401) {
              void handle401Recovery();
            }
            reportError(new Error(`Supabase request failed: ${res.status}`), {
              operation: "supabase.fetch",
              extra: { status: res.status, durationMs: duration },
            });
          } else if (duration > 350) {
            reportPerformance("supabase.fetch", duration);
          }
          return res;
        } catch (err) {
          const duration = Date.now() - start;
          reportError(err, { operation: "supabase.fetch", extra: { durationMs: duration } });
          throw err;
        }
      },
    },
  }
);