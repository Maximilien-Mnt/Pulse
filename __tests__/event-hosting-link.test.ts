import { isValidLink, normalizeLink } from "@/utils/links";
import { eventPrivateSchema, eventPublicSchema } from "@/utils/validation";

const FUTURE = () => new Date(Date.now() + 86400000).toISOString();

function publicBase(overrides: Record<string, unknown> = {}) {
  return {
    name: "Run",
    sport: "running",
    sports: ["running"],
    required_levels: { running: "Débutant" },
    short_description: "Une course conviviale en ville",
    description: "x".repeat(60),
    country: "FR",
    city: "Paris",
    hosting: "in_app",
    registration_url: normalizeLink("example.com/inscription"),
    start_date: FUTURE(),
    ...overrides,
  };
}

describe("event hosting + link validation", () => {
  it("rejects non-link text in registration_url", () => {
    const r = eventPublicSchema.safeParse(publicBase({ registration_url: "not a link at all" }));
    expect(r.success).toBe(false);
  });

  it("requires the registration link in every hosting mode (in_app included)", () => {
    const r = eventPublicSchema.safeParse(publicBase({ registration_url: "" }));
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.errors.some((e) => e.path[0] === "registration_url")).toBe(true);
    }
  });

  it("requires link when external", () => {
    const r = eventPublicSchema.safeParse(
      publicBase({ hosting: "external", registration_url: "" })
    );
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.errors.some((e) => e.path[0] === "registration_url")).toBe(true);
    }
  });

  it("accepts flexible links when external", () => {
    for (const url of ["example.com/inscription", "https://federation-sport.lu/event?id=1", "http://localhost:3000/e/1", "https://sub.domain.co.uk/path?q=1#h"]) {
      const r = eventPublicSchema.safeParse(
        publicBase({ hosting: "external", registration_url: normalizeLink(url) })
      );
      expect(r.success).toBe(true);
    }
  });

  it("private schema enforces the same rule", () => {
    const r = eventPrivateSchema.safeParse({
      name: "Run",
      sport: "running",
      sports: ["running"],
      required_levels: { running: "Débutant" },
      short_description: "Un footing entre amis",
      hosting: "in_app",
      registration_url: "",
      start_date: FUTURE(),
      invitees: [],
    });
    expect(r.success).toBe(false);
  });

  it("isValidLink unit checks", () => {
    expect(isValidLink("hello world")).toBe(false);
    expect(isValidLink("justtext")).toBe(false);
    expect(isValidLink("example.com")).toBe(true);
    expect(isValidLink("https://example.com/a?b=1")).toBe(true);
    expect(normalizeLink("example.com")).toBe("https://example.com");
  });
});
