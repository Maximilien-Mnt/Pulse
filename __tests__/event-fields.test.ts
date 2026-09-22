import { eventPrivateSchema, eventPublicSchema } from "@/utils/validation";
import { normalizeLink } from "@/utils/links";

const FUTURE = () => new Date(Date.now() + 86400000).toISOString();

describe("event rich fields validation", () => {
  function validPublic(overrides: Record<string, unknown> = {}) {
    return {
      name: "Tournoi d'ouverture",
      sport: "football",
      sports: ["football", "basketball"],
      required_levels: { football: "Régional" },
      short_description: "Un tournoi convivial pour lancer la saison",
      description: "Programme complet, buvette et animations toute la journée.",
      country: "FR",
      city: "Paris",
      hosting: "in_app",
      registration_url: normalizeLink("example.com/inscription"),
      venue_address: "12 rue du Stade",
      postal_code: "75011",
      contact_email: "contact@club.fr",
      league: "Nationale 2",
      website_url: normalizeLink("club.fr"),
      start_date: FUTURE(),
      ...overrides,
    };
  }

  it("accepts a full public payload and trims level maps per sport at call sites", () => {
    const r = eventPublicSchema.safeParse(validPublic());
    expect(r.success).toBe(true);
  });

  it("requires the short description and at least one sport", () => {
    expect(eventPublicSchema.safeParse(validPublic({ short_description: "" })).success).toBe(false);
    expect(eventPublicSchema.safeParse(validPublic({ sports: [] })).success).toBe(false);
  });

  it("keeps the long description optional with a 2000-char ceiling", () => {
    expect(eventPublicSchema.safeParse(validPublic({ description: undefined })).success).toBe(true);
    expect(eventPublicSchema.safeParse(validPublic({ description: "x".repeat(2001) })).success).toBe(
      false
    );
  });

  it("validates the optional contact email when set", () => {
    expect(eventPublicSchema.safeParse(validPublic({ contact_email: "not-an-email" })).success).toBe(
      false
    );
    expect(eventPublicSchema.safeParse(validPublic({ contact_email: "" })).success).toBe(true);
  });

  it("private schema shares the same description / sports rules", () => {
    const base: Record<string, unknown> = {
      name: "Footing",
      sport: "running",
      sports: ["running"],
      short_description: "Un footing entre amis",
      hosting: "in_app",
      registration_url: normalizeLink("example.com/go"),
      start_date: FUTURE(),
      invitees: [],
    };
    expect(eventPrivateSchema.safeParse(base).success).toBe(true);
    expect(
      eventPrivateSchema.safeParse({ ...base, short_description: "" }).success
    ).toBe(false);
    expect(eventPrivateSchema.safeParse({ ...base, sports: [] }).success).toBe(false);
  });
});
