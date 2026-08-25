import "react-native-url-polyfill/auto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Platform } from "react-native";
import type { Database } from "@/types";
import { secureStorage } from "./storage";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("[Supabase] Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. Requests will fail until env is loaded.");
}

const DEV_LOG = typeof globalThis !== "undefined" && typeof (globalThis as any).__DEV__ !== "undefined"
  ? (globalThis as any).__DEV__
  : process.env.NODE_ENV !== "production";

function logSupabase(label: string, args: any[]) {
  if (!DEV_LOG) return;
  try {
    const method = args[0];
    const rest = args.slice(1);
    console.log(`[Supabase][${label}]`, method, ...rest);
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
        const start = Date.now();
        try {
          logSupabase("REQUEST", [url, init?.method ?? "GET"]);
          const res = await fetch(input, init);
          const duration = Date.now() - start;
          if (!res.ok) {
            // Clone the response so the original body stream stays intact for supabase-js
            // to consume (otherwise "body stream already read" TypeError crashes the caller).
            const text = await res.clone().text().catch(() => "");
            console.warn(`[Supabase][ERROR] ${res.status} ${res.statusText} -> ${url} (${duration}ms)`);
            console.warn(text.slice(0, 500));
          } else if (DEV_LOG && duration > 350) {
            console.log(`[Supabase][SLOW] ${res.status} ${url} (${duration}ms)`);
          }
          return res;
        } catch (err) {
          const duration = Date.now() - start;
          console.warn(`[Supabase][NETWORK] ${url} (${duration}ms)`, err);
          throw err;
        }
      },
    },
  }
);