import "react-native-url-polyfill/auto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types";
import { sessionStorage } from "./storage";
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

const storage = sessionStorage;

export const signupEdgeFunctionUrl = `${supabaseUrl}/functions/v1/signup`;

/**
 * L'injection de `X-Device-Id` est réservée aux appels vers l'edge function
 * de signup (bot protection / rate-limit par appareil). Les requêtes REST
 * classiques (tables, abonnements Realtime) ne doivent pas porter ce header
 * custom : cela éviterait des préflights CORS inutiles sur web et réduirait
 * le volume de données transmises.
 */
function isSignupEdgeFunction(url: string): boolean {
  return url.includes("/functions/v1/signup");
}

// Lazily resolved device id so the signup edge function carries X-Device-Id
// without blocking the first request. Resolves on first use.
let _deviceIdPromise: Promise<string> | null = null;

// Guards against re-entrant 401 recovery.
let _recoveringFrom401 = false;

// Compteur de 401 consécutifs : évite une déconnexion immédiate sur une
// erreur transitoire (réseau, race de refresh). Seuil de 2 avant récupération.
let _consecutive401 = 0;
const RECOVERY_THRESHOLD = 2;

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
    _consecutive401 = 0;
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
        const url =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.toString()
              : input.url;
        const safeUrl = redactUrl(url);
        const start = Date.now();
        try {
          logSupabase("REQUEST", [safeUrl, init?.method ?? "GET"]);

          // X-Device-Id uniquement vers l'edge function signup.
          const modifiedInit: RequestInit = {
            ...init,
            headers: {
              ...(init?.headers ?? {}),
            },
          };
          if (isSignupEdgeFunction(url)) {
            const deviceId = await getCachedDeviceId();
            if (deviceId) {
              modifiedInit.headers = {
                ...modifiedInit.headers,
                "X-Device-Id": deviceId,
              };
            }
          }

          const res = await fetch(input, modifiedInit);
          const duration = Date.now() - start;

          // Réinitialise le compteur 401 sur toute réponse réussie.
          if (res.ok) {
            _consecutive401 = 0;
          }

          if (!res.ok) {
            // Never log response bodies: they may contain user-generated content.
            logger.warn("supabase", `request failed: ${res.status} ${safeUrl} (${duration}ms)`);

            if (res.status === 401) {
              _consecutive401 += 1;
              // Seuil avant déconnexion : évite la déconnexion sur un 401
              // transitoire (réseau instable, course de refresh token).
              if (_consecutive401 >= RECOVERY_THRESHOLD) {
                void handle401Recovery();
              }
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
