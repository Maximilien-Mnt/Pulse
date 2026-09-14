import "react-native-url-polyfill/auto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types";
import { secureStorage } from "./storage";
import { logger } from "@/lib/reporting/logger";
import { reportError, reportPerformance } from "@/lib/reporting/errorReport";
import { redactUrl } from "@/lib/reporting/redact";

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
          const res = await fetch(input, init);
          const duration = Date.now() - start;
          if (!res.ok) {
            // Never log response bodies: they may contain user-generated content.
            logger.warn("supabase", `request failed: ${res.status} ${safeUrl} (${duration}ms)`);
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