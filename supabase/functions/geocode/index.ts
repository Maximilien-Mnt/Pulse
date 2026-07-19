// Edge Function: geocode
// Geocode an address using Nominatim (OpenStreetMap)
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

interface GeocodeInput {
  address: string;
  format?: string;
  limit?: number;
}

interface GeocodeResult {
  latitude: number;
  longitude: number;
  display_name: string;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const { address, format = "json", limit = 1 }: GeocodeInput = await req.json();

    if (!address || address.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Address is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const params = new URLSearchParams({
      q: address.trim(),
      format,
      limit: limit.toString(),
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
      return new Response(JSON.stringify({ error: "No results found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const result: GeocodeResult = {
      latitude: parseFloat(data[0].lat),
      longitude: parseFloat(data[0].lon),
      display_name: data[0].display_name,
    };

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
