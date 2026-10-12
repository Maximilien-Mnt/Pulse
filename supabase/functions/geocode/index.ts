// Edge Function: geocode
// Geocode an address using Nominatim (OpenStreetMap)
// Authenticated users only: deploy with verify_jwt=true AND pass a user JWT.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { handlePreflight, jsonWithCors } from "../_shared/cors.ts";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const MAX_ADDRESS = 300;
const MAX_LIMIT = 5;

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

  // Require an authenticated caller so this cannot be used as an open
  // third-party proxy / quota burner.
  const authHeader = req.headers.get("authorization") ?? "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  if (supabaseUrl && anonKey) {
    const caller = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data, error } = await caller.auth.getUser();
    if (error || !data?.user) {
      return jsonWithCors(req, { error: "Unauthorized" }, 401);
    }
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

    const response = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
      headers: {
        "User-Agent": "Pulse/1.0 (contact@pulse.app)",
        "Accept-Language": "fr,en",
      },
    });

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data || data.length === 0) {
      return jsonWithCors(req, { error: "No results found" }, 404);
    }

    const result: GeocodeResult = {
      latitude: parseFloat(data[0].lat),
      longitude: parseFloat(data[0].lon),
      display_name: data[0].display_name,
    };

    return jsonWithCors(req, result as unknown as Record<string, unknown>);
  } catch {
    return jsonWithCors(req, { error: "Geocoding failed" }, 500);
  }
});
