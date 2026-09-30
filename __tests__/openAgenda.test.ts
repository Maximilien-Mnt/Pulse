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

  it("excludes foreign physical listings but keeps online ones from the reviewed agenda", () => {
    // Mixed events (attendanceMode 3) happen at a venue, so they follow the
    // in-person rules and must be in Luxembourg.
    expect(normalizeOpenAgendaEvent(makeEvent({
      attendanceMode: 3,
      location: { countryCode: "FR", city: "Thionville" },
    }), agenda, now)).toBeNull();

    // A physical listing without a verifiable country code is not evidence of a
    // Luxembourg venue, so it must not be imported as a Luxembourg event.
    expect(normalizeOpenAgendaEvent(makeEvent({
      attendanceMode: 1,
      location: { adminLevel4: "Luxembourg" },
    }), agenda, now)).toBeNull();

    // Online listings are accepted because the agenda itself is reviewed.
    const online = normalizeOpenAgendaEvent(makeEvent({
      attendanceMode: 2,
      location: { countryCode: "DE", city: "Trier" },
      onlineAccessLink: "https://live.example/stream",
    }), agenda, now);
    expect(online).not.toBeNull();
    expect(online).toMatchObject({ country: "LU", city: "Trier", source_name: "OpenAgenda" });
  });

  it("only imports records the API reports as published", () => {
    expect(normalizeOpenAgendaEvent(makeEvent({ state: 2 }), agenda, now)).not.toBeNull();
    expect(normalizeOpenAgendaEvent(makeEvent({ state: 1 }), agenda, now)).toBeNull();
    expect(normalizeOpenAgendaEvent(makeEvent({ state: 0 }), agenda, now)).toBeNull();
    expect(normalizeOpenAgendaEvent(makeEvent({ state: -1 }), agenda, now)).toBeNull();
  });

  it("maps the API postal code and the legacy coordinates alias", () => {
    const normalized = normalizeOpenAgendaEvent(makeEvent({
      location: {
        countryCode: "LU",
        adminLevel4: "Esch-sur-Alzette",
        postalCode: "4001",
        coordinates: { lat: 49.5, lon: 5.98 },
      },
    }), agenda, now);
    expect(normalized).toMatchObject({
      city: "Esch-sur-Alzette",
      postal_code: "4001",
      latitude: 49.5,
      longitude: 5.98,
    });
  });

  it("uses only http(s) links and never copies organizer contact details", () => {
    const withContactFields = {
      ...makeEvent(),
      onlineAccessLink: undefined,
      registration: [
        { type: "email", value: "organizer@example.org" },
        { type: "phone", value: "+352 1234 5678" },
      ],
      location: {
        name: "Parc central",
        address: "1 rue des Sports",
        adminLevel4: "Luxembourg",
        countryCode: "LU",
        email: "secret@example.org",
        phone: "+352 999",
      },
    } as OpenAgendaEvent;

    const normalized = normalizeOpenAgendaEvent(withContactFields, agenda, now);
    expect(normalized?.registration_url).toBe(normalized?.source_url);
    expect(JSON.stringify(normalized)).not.toContain("organizer@example.org");
    expect(JSON.stringify(normalized)).not.toContain("secret@example.org");
    expect(JSON.stringify(normalized)).not.toContain("+352");
    const keys = Object.keys(normalized ?? {});
    expect(keys.some((key) => /email|phone|image|logo|hero/i.test(key))).toBe(false);
  });

  it("prefers an explicit canonical URL and rejects unsafe or missing source URLs", () => {
    const canonical = normalizeOpenAgendaEvent(
      makeEvent({ canonicalUrl: "https://openagenda.com/lux-sport/events/trail-2026" }),
      agenda,
      now,
    );
    expect(canonical?.source_url).toBe("https://openagenda.com/lux-sport/events/trail-2026");

    // A non-http source URL is ignored in favour of the generated listing page.
    const unsafe = normalizeOpenAgendaEvent(
      makeEvent({ canonicalUrl: "javascript:alert(1)" }),
      agenda,
      now,
    );
    expect(unsafe?.source_url).toBe("https://openagenda.com/lux-sport/events/trail-de-luxembourg");

    // Without slugs there is no source page to attribute the record to.
    expect(normalizeOpenAgendaEvent(
      makeEvent({ slug: undefined }),
      { uid: 12, slug: null, title: "Lux Sport" },
      now,
    )).toBeNull();
  });

  it("never reports an unconfirmed price as free", () => {
    // An explicit amount wins over free wording in the same sentence.
    const mixed = normalizeOpenAgendaEvent(
      makeEvent({ conditions: { fr: "Gratuit pour les membres, 15 EUR pour les autres." } }),
      agenda,
      now,
    );
    expect(mixed).toMatchObject({ price_cents: 1500, is_paid: true });

    const free = normalizeOpenAgendaEvent(makeEvent({ conditions: { fr: "Entrée libre" } }), agenda, now);
    expect(free).toMatchObject({ price_cents: 0, is_paid: false });

    // No amount and no free wording: the schema cannot flag "unknown", so the
    // source wording is preserved and the display stays cautious.
    const unknown = normalizeOpenAgendaEvent(
      makeEvent({ conditions: { fr: "Sur inscription obligatoire." } }),
      agenda,
      now,
    );
    expect(unknown).toMatchObject({ price_cents: 0, is_paid: false });
    expect(unknown?.description).toContain("Conditions: Sur inscription obligatoire.");
  });

  it("keeps repeated sync IDs stable per event and unique between events", async () => {
    const first = await stableOpenAgendaEventId(345);
    expect(await stableOpenAgendaEventId(345)).toBe(first);
    // The UID is globally unique, so a string/number form must hash identically
    // and two events must never collide (idempotent upserts, no deletes).
    expect(await stableOpenAgendaEventId("345")).toBe(first);
    expect(await stableOpenAgendaEventId(346)).not.toBe(first);
  });

  it("produces the same valid UUID for the same globally unique event UID", async () => {
    const first = await stableOpenAgendaEventId(345);
    const second = await stableOpenAgendaEventId(345);
    expect(first).toBe(second);
    expect(first).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});
