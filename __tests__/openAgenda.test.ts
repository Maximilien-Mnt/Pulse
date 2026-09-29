import { normalizeOpenAgendaEvent, stableOpenAgendaEventId, type OpenAgendaEvent } from "@/lib/openAgenda";

const now = new Date("2026-09-29T10:00:00.000Z");
const agenda = { uid: 12, slug: "lux-sport", title: "Lux Sport" };

function makeEvent(overrides: Partial<OpenAgendaEvent> = {}): OpenAgendaEvent {
  return {
    uid: 345,
    slug: "trail-de-luxembourg",
    title: { fr: "Trail de Luxembourg", en: "Luxembourg Trail" },
    description: { fr: "Une course ouverte à tous." },
    longDescription: { fr: "**Parcours** dans la forêt." },
    conditions: { fr: "Inscription: 25,50 EUR" },
    keywords: { fr: ["trail", "course à pied"] },
    timings: [
      { begin: "2026-09-28T09:00:00+02:00", end: "2026-09-28T11:00:00+02:00" },
      { begin: "2026-10-10T08:00:00+02:00", end: "2026-10-10T11:00:00+02:00" },
    ],
    location: {
      name: "Parc central",
      address: "1 rue des Sports",
      city: "Luxembourg",
      postalCode: "1610",
      countryCode: "LU",
      latitude: 49.61,
      longitude: 6.13,
    },
    registration: [{ type: "link", value: "https://tickets.example/register/345" }],
    status: "Scheduled",
    age: { min: 16, max: 70 },
    ...overrides,
  };
}

describe("OpenAgenda event normalization", () => {
  it("maps a published Luxembourg sports listing into Pulse's external event shape", () => {
    const normalized = normalizeOpenAgendaEvent(makeEvent(), agenda, now);

    expect(normalized).toMatchObject({
      name: "Trail de Luxembourg",
      sport: "running",
      short_description: "Une course ouverte à tous.",
      country: "LU",
      city: "Luxembourg",
      postal_code: "1610",
      venue_address: "Parc central — 1 rue des Sports",
      latitude: 49.61,
      longitude: 6.13,
      start_date: "2026-10-10T06:00:00.000Z",
      end_date: "2026-10-10T09:00:00.000Z",
      price_cents: 2550,
      is_paid: true,
      category: "trail, course à pied",
      registration_url: "https://tickets.example/register/345",
      source_url: "https://openagenda.com/lux-sport/events/trail-de-luxembourg",
      source_name: "OpenAgenda",
      is_external: true,
      age_min: 16,
      age_max: 70,
      sports: ["running"],
    });
    expect(normalized?.description).toContain("Parcours dans la forêt.");
    expect(normalized?.description).toContain("Conditions: Inscription: 25,50 EUR");
  });

  it("uses the source event page when no registration link is provided", () => {
    const event = makeEvent({ registration: [], onlineAccessLink: undefined });
    const normalized = normalizeOpenAgendaEvent(event, agenda, now);
    expect(normalized?.registration_url).toBe(normalized?.source_url);
  });

  it("does not ingest non-sport events, non-Luxembourg venues, or cancelled listings", () => {
    expect(normalizeOpenAgendaEvent(makeEvent({ title: "Jazz concert", keywords: { fr: ["musique"] } }), agenda, now)).toBeNull();
    expect(normalizeOpenAgendaEvent(makeEvent({ location: { countryCode: "FR" } }), agenda, now)).toBeNull();
    expect(normalizeOpenAgendaEvent(makeEvent({ status: { fr: "Annulé" } }), agenda, now)).toBeNull();
    expect(normalizeOpenAgendaEvent(makeEvent({ status: 6 }), agenda, now)).toBeNull();
  });

  it("uses the API's adminLevel4 municipality when a city alias is absent", () => {
    const normalized = normalizeOpenAgendaEvent(makeEvent({
      location: { countryCode: "LU", adminLevel4: "Esch-sur-Alzette" },
    }), agenda, now);
    expect(normalized?.city).toBe("Esch-sur-Alzette");
  });

  it("retains online events listed by a Luxembourg agenda without inventing a venue", () => {
    const normalized = normalizeOpenAgendaEvent(makeEvent({
      attendanceMode: 2,
      location: undefined,
      onlineAccessLink: "https://live.example/stream",
      registration: [],
    }), agenda, now);
    expect(normalized?.city).toBe("Online");
    expect(normalized?.venue_address).toBeNull();
    expect(normalized?.registration_url).toBe("https://live.example/stream");
  });

  it("produces the same valid UUID for the same globally unique event UID", async () => {
    const first = await stableOpenAgendaEventId(345);
    const second = await stableOpenAgendaEventId(345);
    expect(first).toBe(second);
    expect(first).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});
