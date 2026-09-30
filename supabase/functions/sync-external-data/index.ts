// Synchronize external sports clubs (OpenStreetMap) and upcoming sports events (OpenAgenda).
// Invoke from a trusted daily job; the function is gated by EXTERNAL_SYNC_SECRET.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  normalizeOpenAgendaEvent,
  stableOpenAgendaEventId,
  type OpenAgendaAgenda,
  type OpenAgendaEvent,
} from "../../../lib/openAgenda.ts";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const OPENAGENDA_API = "https://api.openagenda.com/v2";
const OPENAGENDA_PAGE_SIZE = 300;
const OPENAGENDA_MAX_EVENTS_PER_AGENDA = 3000;

interface OverpassElement {
  type: string;
  id: number;
  tags?: Record<string, string>;
  center?: { lat: number; lon: number };
}

interface OverpassResponse {
  elements: OverpassElement[];
}

interface ExternalEventRow extends Record<string, unknown> {
  id: string;
}

const COUNTRIES = [
  { code: "LU", name: "Luxembourg", bbox: "5.5,49.4,6.5,50.2" },
  { code: "FR", name: "France", bbox: "-5.0,41.0,9.0,51.0" },
  { code: "BE", name: "Belgium", bbox: "2.5,49.5,6.5,51.5" },
];

function generateOverpassQuery(bbox: string): string {
  return `
    [out:json][timeout:180];
    (
      node["amenity"="club"](${bbox});
      way["amenity"="club"](${bbox});
      node["leisure"="sports_centre"](${bbox});
      way["leisure"="sports_centre"](${bbox});
      node["leisure"="fitness_centre"](${bbox});
      way["leisure"="fitness_centre"](${bbox});
    );
    out center;
  `;
}

async function fetchOverpassData(query: string): Promise<OverpassResponse> {
  const response = await fetch(OVERPASS_URL, {
    method: "POST",
    body: query,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "Pulse/1.0 (external-data-sync)",
    },
  });
  if (!response.ok) throw new Error(`Overpass API error: ${response.status}`);
  return await response.json() as OverpassResponse;
}

async function syncClubsForCountry(
  supabase: ReturnType<typeof createClient>,
  country: { code: string; name: string; bbox: string },
): Promise<number> {
  const data = await fetchOverpassData(generateOverpassQuery(country.bbox));
  let syncedCount = 0;

  for (const element of data.elements) {
    const tags = element.tags;
    if (!tags?.name) continue;
    const latitude = element.center?.lat;
    const longitude = element.center?.lon;
    if (typeof latitude !== "number" || typeof longitude !== "number") continue;
    // (0, 0) is OpenStreetMap's "null island" data error, not a real venue.
    if (latitude === 0 && longitude === 0) continue;

    const address = [tags["addr:street"], tags["addr:housenumber"], tags["addr:city"], tags["addr:postcode"]]
      .filter(Boolean)
      .join(", ");
    // Keep the historical `source_url` scheme: it is the upsert conflict key
    // (`onConflict: "source_url"`), so switching hosts would insert duplicate
    // rows for every element already synchronized under the previous URL
    // instead of updating it. Changing it needs a data migration first.
    const sourceUrl = `https://osm.org/${element.type}/${element.id}`;
    const { error } = await supabase.from("external_clubs").upsert(
      {
        name: tags.name,
        sport: tags.sport || tags.leisure || null,
        address: address || null,
        city: tags["addr:city"] || null,
        country: country.name,
        latitude,
        longitude,
        website: tags.website || null,
        phone: tags.phone || null,
        email: tags.email || null,
        source_url: sourceUrl,
        source_name: "OpenStreetMap",
        is_external: true,
        external_id: String(element.id),
      },
      { onConflict: "source_url" },
    );
    if (!error) syncedCount++;
    else console.error(`OpenStreetMap record ${sourceUrl} failed:`, error.message);
  }
  return syncedCount;
}

async function openAgendaGet<T>(path: string, apiKey: string): Promise<T> {
  const response = await fetch(`${OPENAGENDA_API}${path}`, {
    headers: { key: apiKey, Accept: "application/json" },
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 500);
    throw new Error(`OpenAgenda API ${response.status}: ${detail}`);
  }
  return await response.json() as T;
}

async function syncOpenAgendaEvents(
  supabase: ReturnType<typeof createClient>,
  apiKey: string,
  agendaUids: string[],
): Promise<number> {
  const activeRows = new Map<string, ExternalEventRow>();

  for (const agendaUid of agendaUids) {
    const agendaRecord = await openAgendaGet<OpenAgendaAgenda>(`/agendas/${encodeURIComponent(agendaUid)}`, apiKey);
    const agenda: OpenAgendaAgenda = {
      uid: agendaRecord.uid ?? agendaUid,
      slug: agendaRecord.slug ?? null,
      title: agendaRecord.title ?? null,
    };
    if (!agenda.slug) {
      console.warn(`OpenAgenda agenda ${agendaUid} has no public slug; records without a canonical URL will be skipped.`);
    }

    const rows: ExternalEventRow[] = [];
    for (let from = 0; from <= OPENAGENDA_MAX_EVENTS_PER_AGENDA; from += OPENAGENDA_PAGE_SIZE) {
      const params = new URLSearchParams({
        "relative[]": "upcoming",
        // Published only. With a public read key the API ignores this filter and
        // returns published events only, so this is a no-op for such keys.
        state: "2",
        // Full time slots (`timings[].begin/end`) and additional fields.
        detailed: "1",
        monolingual: "fr",
        size: String(OPENAGENDA_PAGE_SIZE),
        from: String(from),
      });
      params.append("relative[]", "current");
      // Documented array syntax for sorts: next upcoming time slot first.
      params.append("sort[]", "timings.asc");
      const response = await openAgendaGet<{ events?: OpenAgendaEvent[] }>(
        `/agendas/${encodeURIComponent(agendaUid)}/events?${params.toString()}`,
        apiKey,
      );
      const events = response.events ?? [];
      if (from >= OPENAGENDA_MAX_EVENTS_PER_AGENDA && events.length) {
        throw new Error(`OpenAgenda agenda ${agendaUid} exceeds the ${OPENAGENDA_MAX_EVENTS_PER_AGENDA}-event safety limit; increase the limit before syncing.`);
      }
      for (const event of events) {
        const normalized = normalizeOpenAgendaEvent(event, agenda);
        if (!normalized || event.uid == null) continue;
        const row = {
          ...normalized,
          id: await stableOpenAgendaEventId(event.uid),
        };
        rows.push(row);
        activeRows.set(row.id, row);
      }
      if (events.length < OPENAGENDA_PAGE_SIZE) break;
    }

    // Keep REST payloads bounded; deterministic IDs make every batch idempotent.
    for (let offset = 0; offset < rows.length; offset += 100) {
      const { error } = await supabase.from("events").upsert(rows.slice(offset, offset + 100), { onConflict: "id" });
      if (error) throw new Error(`Could not upsert OpenAgenda events for ${agendaUid}: ${error.message}`);
    }
    console.log(`OpenAgenda agenda ${agendaUid}: synchronized ${rows.length} eligible upcoming sports events.`);
  }

  // Hide removed/cancelled/past or no-longer-sport listings; retain rows so
  // favorites/history are not destructively deleted. Only touch this source.
  const activeIds = new Set(activeRows.keys());
  const existingIds: string[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("events")
      .select("id")
      .eq("is_external", true)
      .eq("source_name", "OpenAgenda")
      .order("id", { ascending: true })
      .range(from, from + 999);
    if (error) throw new Error(`Could not inspect previous OpenAgenda events: ${error.message}`);
    existingIds.push(...(data ?? []).map((row: { id: string }) => row.id));
    if ((data ?? []).length < 1000) break;
  }
  const staleIds = existingIds.filter((id) => !activeIds.has(id));
  for (let offset = 0; offset < staleIds.length; offset += 100) {
    const { error } = await supabase
      .from("events")
      .update({ is_private: true })
      .in("id", staleIds.slice(offset, offset + 100));
    if (error) throw new Error(`Could not hide stale OpenAgenda events: ${error.message}`);
  }
  return activeRows.size;
}

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const expectedSecret = Deno.env.get("EXTERNAL_SYNC_SECRET");
  const receivedSecret = req.headers.get("x-sync-secret");
  if (!expectedSecret || !receivedSecret || receivedSecret !== expectedSecret) {
    return json({ error: "Unauthorized" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return json({ error: "Supabase server configuration is missing" }, 503);

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const startedAt = Date.now();
  let clubsSynced = 0;
  const clubErrors: string[] = [];

  // Preserve the existing OSM club synchronization behavior.
  for (const country of COUNTRIES) {
    try {
      clubsSynced += await syncClubsForCountry(supabase, country);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      clubErrors.push(`${country.code}: ${message}`);
      console.error(`OpenStreetMap sync failed for ${country.name}:`, message);
    }
  }

  const apiKey = Deno.env.get("OPENAGENDA_API_KEY");
  const agendaUids = (Deno.env.get("OPENAGENDA_AGENDA_UIDS") ?? "")
    .split(",")
    .map((uid) => uid.trim())
    .filter((uid) => /^\d+$/.test(uid));
  let eventsSynced = 0;
  let eventSyncError: string | null = null;

  if (!apiKey || !agendaUids.length) {
    eventSyncError = "Set OPENAGENDA_API_KEY and OPENAGENDA_AGENDA_UIDS to import events.";
  } else {
    try {
      eventsSynced = await syncOpenAgendaEvents(supabase, apiKey, agendaUids);
    } catch (error) {
      eventSyncError = error instanceof Error ? error.message : "Unknown OpenAgenda error";
      console.error("OpenAgenda sync failed:", eventSyncError);
    }
  }

  return json({
    success: eventSyncError === null,
    clubs_synced: clubsSynced,
    events_synced: eventsSynced,
    event_sync_error: eventSyncError,
    club_sync_errors: clubErrors,
    duration_ms: Date.now() - startedAt,
  }, eventSyncError ? 502 : 200);
});
