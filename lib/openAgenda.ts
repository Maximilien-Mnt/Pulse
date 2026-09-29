export type OpenAgendaAgenda = {
  uid: string | number;
  slug?: string | null;
  title?: string | null;
};

type Localized = string | string[] | number | Record<string, unknown> | null | undefined;
type OpenAgendaTiming = { begin?: string; end?: string };

export type OpenAgendaEvent = {
  uid?: string | number;
  slug?: string;
  title?: Localized;
  description?: Localized;
  longDescription?: Localized;
  conditions?: Localized;
  keywords?: Localized;
  timings?: OpenAgendaTiming[];
  location?: {
    name?: Localized;
    address?: Localized;
    city?: Localized;
    adminLevel4?: Localized;
    postalCode?: string;
    countryCode?: string;
    latitude?: number;
    longitude?: number;
    coordinates?: { lat?: number; lon?: number; lng?: number };
  };
  registration?: Array<{ type?: string; value?: string }> | string[];
  onlineAccessLink?: string;
  canonicalUrl?: string;
  url?: string;
  status?: Localized;
  attendanceMode?: number;
  age?: { min?: number; max?: number };
};

export type PulseExternalEventInsert = {
  name: string;
  sport: string;
  description: string;
  short_description: string;
  country: string;
  city: string;
  postal_code: string | null;
  venue_address: string | null;
  latitude: number | null;
  longitude: number | null;
  start_date: string;
  end_date: string | null;
  price_cents: number;
  is_paid: boolean;
  difficulty: number;
  category: string;
  registration_url: string;
  is_external: true;
  source_url: string;
  source_name: "OpenAgenda";
  is_private: false;
  website_url: string | null;
  age_min: number | null;
  age_max: number | null;
  sports: string[];
  required_levels: Record<string, never>;
};

function localizedText(value: Localized): string {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) return value.filter((part): part is string => typeof part === "string").join(", ").trim();
  if (value && typeof value === "object") {
    for (const language of ["fr", "en", "de", "it", "es"]) {
      const candidate = value[language];
      if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
      if (Array.isArray(candidate)) {
        const joined = candidate.filter((part): part is string => typeof part === "string").join(", ").trim();
        if (joined) return joined;
      }
    }
    for (const candidate of Object.values(value)) {
      const nested = localizedText(candidate as Localized);
      if (nested) return nested;
    }
  }
  return "";
}

function plainText(markdown: string): string {
  return markdown
    .replace(/<[^>]*>/g, " ")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/\*\*|__|[*_`~]/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function safeHttpUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function sportFor(event: OpenAgendaEvent, keywordText: string): string | null {
  const searchable = [
    localizedText(event.title),
    localizedText(event.description),
    keywordText,
  ].join(" ").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  const rules: Array<[string, RegExp]> = [
    ["football", /\b(football|soccer|futsal|foot a 5|foot a 7)\b/],
    ["basketball", /\b(basketball|basket|3x3)\b/],
    ["tennis", /\btennis\b/],
    ["running", /\b(running|course a pied|trail|marathon|semi-marathon|jogging)\b/],
    ["cycling", /\b(cycling|cyclisme|velo|vtt|gravel|cyclocross)\b/],
    ["swimming", /\b(swimming|natation|nage|aquatique)\b/],
    ["volleyball", /\b(volleyball|volley-ball)\b/],
    ["handball", /\bhandball\b/],
    ["padel", /\bpadel\b/],
    ["badminton", /\bbadminton\b/],
    ["fitness", /\b(fitness|crossfit|cross-training|musculation|hiit|workout)\b/],
    ["rugby", /\brugby\b/],
    ["squash", /\bsquash\b/],
    ["table_tennis", /\b(table tennis|tennis de table|ping-pong)\b/],
    ["martial_arts", /\b(judo|karate|taekwondo|arts martiaux|self-defense|self defense)\b/],
    ["yoga", /\byoga\b/],
    ["pilates", /\bpilates\b/],
    ["boxing", /\b(boxing|boxe|kickboxing)\b/],
    ["climbing", /\b(climbing|escalade|bouldering|bloc)\b/],
    ["golf", /\bgolf\b/],
    ["dance", /\b(dance|danse|zumba)\b/],
    ["surfing", /\b(surfing|surf|bodyboard)\b/],
  ];
  return rules.find(([, pattern]) => pattern.test(searchable))?.[0] ?? null;
}

function priceFromConditions(conditions: string): number {
  const normalized = conditions.toLowerCase();
  if (/\b(gratuit|gratuite|free|frei|entrée libre)\b/.test(normalized)) return 0;
  const match = normalized.match(/(?:€\s*(\d+(?:[.,]\d{1,2})?)|(\d+(?:[.,]\d{1,2})?)\s*(?:€|eur(?:os)?))/i);
  if (!match) return 0;
  const amountText = match[1] ?? match[2];
  if (!amountText) return 0;
  const amount = Number(amountText.replace(",", "."));
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount * 100) : 0;
}

function isCancelled(status: Localized): boolean {
  if (status === 6 || status === "6") return true;
  if (status && typeof status === "object" && !Array.isArray(status)) {
    const statusObject = status as Record<string, unknown>;
    if (statusObject.id === 6 || statusObject.code === 6 || statusObject.status === 6) return true;
  }
  return /cancel|annul|abgesagt/i.test(localizedText(status));
}

function nextTiming(timings: OpenAgendaTiming[] | undefined, now: Date): OpenAgendaTiming | null {
  const valid = (timings ?? [])
    .filter((timing) => timing?.begin && Number.isFinite(Date.parse(timing.begin)))
    .sort((a, b) => Date.parse(a.begin!) - Date.parse(b.begin!));
  return valid.find((timing) => Date.parse(timing.begin!) >= now.getTime())
    ?? valid.find((timing) => !timing.end || Date.parse(timing.end) >= now.getTime())
    ?? null;
}

/** Convert a published OpenAgenda record to the app's existing `events` row shape. */
export function normalizeOpenAgendaEvent(
  event: OpenAgendaEvent,
  agenda: OpenAgendaAgenda,
  now = new Date(),
): PulseExternalEventInsert | null {
  const uid = event.uid == null ? "" : String(event.uid);
  const title = localizedText(event.title);
  if (!uid || !title || isCancelled(event.status)) return null;

  const location = event.location ?? {};
  const countryCode = (location.countryCode ?? "").toUpperCase();
  const isOnline = event.attendanceMode === 2;
  if (countryCode !== "LU" && !isOnline) return null;
  if (countryCode && countryCode !== "LU") return null;

  const description = plainText(localizedText(event.description));
  const keywords = localizedText(event.keywords);
  const sport = sportFor(event, keywords);
  // Pulse is a sports community; avoid turning non-sport cultural listings into
  // incorrectly categorized Pulse events.
  if (!sport) return null;

  const timing = nextTiming(event.timings, now);
  if (!timing) return null;

  const generatedSourceUrl = event.slug && agenda.slug
    ? `https://openagenda.com/${encodeURIComponent(agenda.slug)}/events/${encodeURIComponent(event.slug)}`
    : null;
  const sourceUrl = safeHttpUrl(event.canonicalUrl) ?? safeHttpUrl(event.url) ?? generatedSourceUrl;
  if (!sourceUrl) return null;

  const registrationEntries = Array.isArray(event.registration) ? event.registration : [];
  const registrationUrl = registrationEntries
    .map((entry) => typeof entry === "string" ? entry : entry?.type === "link" ? entry.value : null)
    .map(safeHttpUrl)
    .find((value): value is string => !!value)
    ?? safeHttpUrl(event.onlineAccessLink)
    ?? sourceUrl;

  const address = localizedText(location.address);
  const venue = localizedText(location.name);
  const venueAddress = [venue, address].filter(Boolean).filter((part, index, all) => all.indexOf(part) === index).join(" — ") || null;
  const city = localizedText(location.city) || localizedText(location.adminLevel4) || (isOnline ? "Online" : "Luxembourg");
  const keywordsForCategory = keywords.slice(0, 120);
  const conditions = plainText(localizedText(event.conditions));
  const longDescription = plainText(localizedText(event.longDescription));
  const details = [
    longDescription,
    conditions ? `Conditions: ${conditions}` : "",
  ].filter(Boolean).join("\n\n").slice(0, 10000);
  const priceCents = priceFromConditions(conditions);
  const latitude = location.latitude ?? location.coordinates?.lat;
  const longitude = location.longitude ?? location.coordinates?.lon ?? location.coordinates?.lng;

  return {
    name: title.slice(0, 140),
    sport,
    short_description: description.slice(0, 200),
    description: details,
    country: "LU",
    city: city.slice(0, 100),
    postal_code: location.postalCode ?? null,
    venue_address: venueAddress,
    latitude: typeof latitude === "number" && Number.isFinite(latitude) ? latitude : null,
    longitude: typeof longitude === "number" && Number.isFinite(longitude) ? longitude : null,
    start_date: new Date(timing.begin!).toISOString(),
    end_date: timing.end && Number.isFinite(Date.parse(timing.end)) ? new Date(timing.end).toISOString() : null,
    price_cents: priceCents,
    is_paid: priceCents > 0,
    difficulty: 1,
    category: keywordsForCategory,
    registration_url: registrationUrl,
    is_external: true,
    source_url: sourceUrl,
    source_name: "OpenAgenda",
    is_private: false,
    website_url: safeHttpUrl(event.onlineAccessLink),
    age_min: Number.isInteger(event.age?.min) ? event.age!.min! : null,
    age_max: Number.isInteger(event.age?.max) ? event.age!.max! : null,
    sports: [sport],
    required_levels: {},
  };
}

/** Stable RFC 4122 version-5-shaped UUID for idempotent event upserts without schema changes. */
export async function stableOpenAgendaEventId(eventUid: string | number): Promise<string> {
  const seed = new TextEncoder().encode(`pulse:openagenda:${eventUid}`);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-1", seed));
  const bytes = Array.from(digest.slice(0, 16));
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x50;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = bytes.map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
