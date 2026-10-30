// Edge Function: geocode
// Geocode an address using Nominatim (OpenStreetMap)
// Authenticated users only: deploy with verify_jwt=true AND pass a user JWT.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { handlePreflight, jsonWithCors } from "../_shared/cors.ts";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const MAX_ADDRESS = 300;
const MAX_LIMIT = 5;
const GEOCODE_TIMEOUT_MS = 10000;

interface GeocodeInput {
  address: string;
  limit?: number;
}

interface GeocodeResult {
  latitude: number;
  longitude: number;
  display_name: string;
}

Deno.serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;
  if (req.method !== "POST") {
    return jsonWithCors(req, { error: "Method not allowed" }, 405);
  }

  // --- Fail-closed authentication ---
  const authHeader = req.headers.get("authorization") ?? "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonWithCors(req, { error: "Server configuration missing" }, 503);
  }

  const caller = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: callerData, error: callerError } = await caller.auth.getUser();
  const callerId = callerData?.user?.id;
  if (callerError || !callerId) {
    return jsonWithCors(req, { error: "Unauthorized" }, 401);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // --- Persistent rate limiting (per user) via RPC ---
  const rateLimitWindow = parseInt(Deno.env.get("GEOCODE_RATE_LIMIT_WINDOW_SECS") ?? "3600", 10);
  const rateLimitPerUser = parseInt(Deno.env.get("GEOCODE_RATE_LIMIT_PER_USER") ?? "60", 10);

  const rateResult = await supabase.rpc("check_rate_limit", {
    p_key_type: "geocode_user",
    p_key_value: callerId,
    p_limit: rateLimitPerUser,
    p_window_secs: rateLimitWindow,
  });

  if (rateResult.error || !(rateResult.data as { allowed?: boolean })?.allowed) {
    return jsonWithCors(req, { error: "Rate limited" }, 429);
  }

  try {
    const { address, limit = 1 }: GeocodeInput = await req.json();

    if (!address || address.trim().length === 0) {
      return jsonWithCors(req, { error: "Address is required" }, 400);
    }
    if (address.trim().length > MAX_ADDRESS) {
      return jsonWithCors(req, { error: "Address too long" }, 400);
    }
    const safeLimit = Math.min(Math.max(Math.floor(limit) || 1, 1), MAX_LIMIT);

    const params = new URLSearchParams({
      q: address.trim(),
      format: "json",
      limit: safeLimit.toString(),
      addressdetails: "1",
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), GEOCODE_TIMEOUT_MS);

    const response = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
      headers: {
        "User-Agent": "Pulse/1.0 (contact@pulse.app)",
        "Accept-Language": "fr,en",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data || data.length === 0) {
      return jsonWithCors(req, { error: "No results found" }, 404);
    }

    // Return all results up to safeLimit (limit parameter is now respected)
    const results = data.slice(0, safeLimit).map((item: any) => ({
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
      display_name: item.display_name,
    }));

    return jsonWithCors(req, results.length === 1 ? results[0] : results);
  } catch {
    return jsonWithCors(req, { error: "Geocoding failed" }, 500);
  }
});
