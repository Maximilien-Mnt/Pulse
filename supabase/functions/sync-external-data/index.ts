// Edge Function: sync-external-data
// Synchronize clubs and events from OpenStreetMap (Overpass API)
// Triggered by cron daily at 3 AM UTC
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

interface OverpassElement {
  type: string;
  id: number;
  tags?: Record<string, string>;
  center?: { lat: number; lon: number };
}

interface OverpassResponse {
  elements: OverpassElement[];
}

interface ClubData {
  name: string;
  sport: string | null;
  address: string | null;
  city: string | null;
  country: string;
  latitude: number;
  longitude: number;
  website: string | null;
  phone: string | null;
  email: string | null;
  source_url: string;
  external_id: string;
}

interface EventData {
  title: string;
  description: string | null;
  sport: string | null;
  address: string | null;
  city: string | null;
  country: string;
  latitude: number;
  longitude: number;
  start_date: string | null;
  end_date: string | null;
  website_url: string | null;
  organizer_name: string | null;
  source_url: string;
  external_id: string;
}

// Countries to sync
const COUNTRIES = [
  { code: "LU", name: "Luxembourg", bbox: "5.5,49.4,6.5,50.2" },
  { code: "FR", name: "France", bbox: "-5.0,41.0,9.0,51.0" },
  { code: "BE", name: "Belgium", bbox: "2.5,49.5,6.5,51.5" },
];

function generateOverpassQuery(bbox: string, sport?: string): string {
  const sportFilter = sport ? `[sport="${sport}"]` : "";
  return `
    [out:json][timeout:180];
    (
      node["amenity"="club"]${sportFilter}(${bbox});
      way["amenity"="club"]${sportFilter}(${bbox});
      node["leisure"="sports_centre"]${sportFilter}(${bbox});
      way["leisure"="sports_centre"]${sportFilter}(${bbox});
      node["leisure"="fitness_centre"]${sportFilter}(${bbox});
      way["leisure"="fitness_centre"]${sportFilter}(${bbox});
    );
    out center;
  `;
}

function extractClubData(element: OverpassElement, country: string): ClubData | null {
  const tags = element.tags;
  if (!tags || !tags.name) return null;

  const lat = element.center?.lat ?? 0;
  const lon = element.center?.lon ?? 0;
  
  if (lat === 0 && lon === 0) return null;

  const address = [
    tags["addr:street"],
    tags["addr:housenumber"],
    tags["addr:city"],
    tags["addr:postcode"],
  ]
    .filter(Boolean)
    .join(", ");

  return {
    name: tags.name,
    sport: tags.sport || tags.leisure || null,
    address: address || null,
    city: tags["addr:city"] || null,
    country,
    latitude: lat,
    longitude: lon,
    website: tags.website || null,
    phone: tags.phone || null,
    email: tags.email || null,
    source_url: `https://osm.org/${element.type}/${element.id}`,
    external_id: element.id.toString(),
  };
}

async function fetchOverpassData(query: string): Promise<OverpassResponse> {
  const response = await fetch(OVERPASS_URL, {
    method: "POST",
    body: query,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "Pulse/1.0 (sync-external-data)",
    },
  });

  if (!response.ok) {
    throw new Error(`Overpass API error: ${response.status}`);
  }

  return response.json();
}

async function syncClubsForCountry(
  supabase: ReturnType<typeof createClient>,
  country: { code: string; name: string; bbox: string }
): Promise<number> {
  console.log(`Syncing clubs for ${country.name}...`);
  
  const query = generateOverpassQuery(country.bbox);
  const data = await fetchOverpassData(query);
  
  let syncedCount = 0;
  
  for (const element of data.elements) {
    const club = extractClubData(element, country.name);
    if (!club) continue;

    const { error } = await supabase.from("external_clubs").upsert(
      {
        name: club.name,
        sport: club.sport,
        address: club.address,
        city: club.city,
        country: club.country,
        latitude: club.latitude,
        longitude: club.longitude,
        website: club.website,
        phone: club.phone,
        email: club.email,
        source_url: club.source_url,
        source_name: "OpenStreetMap",
        is_external: true,
        external_id: club.external_id,
      },
      { onConflict: "source_url" }
    );

    if (!error) syncedCount++;
  }

  console.log(`Synced ${syncedCount} clubs for ${country.name}`);
  return syncedCount;
}

Deno.serve(async (req) => {
  // Only allow POST or cron jobs
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    console.log("Starting external data sync...");
    const startTime = Date.now();

    let totalClubs = 0;

    // Sync clubs for each country
    for (const country of COUNTRIES) {
      try {
        const count = await syncClubsForCountry(supabase, country);
        totalClubs += count;
      } catch (error) {
        console.error(`Error syncing ${country.name}:`, error);
      }
    }

    const duration = Date.now() - startTime;
    console.log(`Sync completed in ${duration}ms. Total clubs: ${totalClubs}`);

    return new Response(
      JSON.stringify({
        success: true,
        clubs_synced: totalClubs,
        duration_ms: duration,
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Sync failed:", error);
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
