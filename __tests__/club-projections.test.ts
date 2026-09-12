import {
  CLUB_CARD_FIELDS,
  CLUB_CARD_SELECT,
  CLUB_DETAIL_FIELDS,
  CLUB_DETAIL_SELECT,
  CLUB_EVENT_FIELDS,
  CLUB_EVENT_SELECT,
} from "@/hooks/clubProjections";
import type { Database } from "@/types";

const parse = (select: string) =>
  select.split(",").map((f) => f.trim()).filter(Boolean);

const contains = (select: string, field: string) =>
  parse(select).includes(field);

// Compile-time schema alignment: every projected field must exist on the
// generated Row schema. Fails `tsc` the moment a field name drifts.
const cardFieldsAreSchemaKeys: (typeof CLUB_CARD_FIELDS)[number] extends
  keyof Database["public"]["Tables"]["clubs"]["Row"]
  ? true
  : never = true;
void cardFieldsAreSchemaKeys;

const detailFieldsAreSchemaKeys: (typeof CLUB_DETAIL_FIELDS)[number] extends
  keyof Database["public"]["Tables"]["clubs"]["Row"]
  ? true
  : never = true;
void detailFieldsAreSchemaKeys;

const eventFieldsAreSchemaKeys: (typeof CLUB_EVENT_FIELDS)[number] extends
  keyof Database["public"]["Tables"]["events"]["Row"]
  ? true
  : never = true;
void eventFieldsAreSchemaKeys;

// ── No wildcard selects anywhere ────────────────────────────────────────────
describe("club projections contain no wildcard", () => {
  it.each([
    ["card", CLUB_CARD_SELECT],
    ["detail", CLUB_DETAIL_SELECT],
    ["event", CLUB_EVENT_SELECT],
  ])("%s projection has no `*`", (_name, select) => {
    expect(parse(select)).not.toContain("*");
    expect(select).not.toMatch(/\*/);
  });
});

// ── Card projection covers every field rendered by the club list cards ──────
describe("CLUB_CARD_SELECT covers every rendered card field", () => {
  const renderedCardFields = [
    "id",
    "name",
    "sport",
    "city",
    "country",
    "member_count",
    "logo_url",
    "hero_urls",
    "is_external",
    "short_description",
    "description",
  ];

  it.each(renderedCardFields)("selects %s", (field) => {
    expect(contains(CLUB_CARD_SELECT, field)).toBe(true);
  });

  it("adds only the creator-enrichment column beyond rendered fields", () => {
    const extra = parse(CLUB_CARD_SELECT).filter(
      (f) => !renderedCardFields.includes(f),
    );
    expect(extra).toEqual(["created_by"]);
  });

  it("select string matches the field list exactly", () => {
    expect(parse(CLUB_CARD_SELECT)).toEqual([...CLUB_CARD_FIELDS]);
  });
});

// ── Detail projection covers the detail header + dashboard renders ──────────
describe("CLUB_DETAIL_SELECT covers every rendered detail/dashboard field", () => {
  const renderedDetailFields = [
    "id",
    "name",
    "sport",
    "short_description",
    "description",
    "country",
    "city",
    "address",
    "postal_code",
    "logo_url",
    "cover_url",
    "hero_urls",
    "registration_url",
    "is_external",
    "is_private",
    "member_count",
    "founded_date",
    "league",
    "age_min",
    "age_max",
    "required_level",
    "required_levels",
    "contact_email",
    "created_by",
    "website_url",
    "opening_hours",
    "sports",
    "phone_number",
    "instagram_url",
    "facebook_url",
    "tiktok_url",
    "extra_link",
  ];

  it.each(renderedDetailFields)("selects %s", (field) => {
    expect(contains(CLUB_DETAIL_SELECT, field)).toBe(true);
  });

  it("matches the projection field list exactly", () => {
    expect(parse(CLUB_DETAIL_SELECT)).toEqual([...CLUB_DETAIL_FIELDS]);
  });
});

// ── Event projection (club detail events list) ─────────────────────────────
describe("CLUB_EVENT_SELECT covers EventCard's rendered fields", () => {
  const renderedEventFields = [
    "id",
    "name",
    "sport",
    "city",
    "start_date",
    "logo_url",
    "is_external",
    "is_paid",
    "price_cents",
    "difficulty",
  ];

  it.each(renderedEventFields)("selects %s", (field) => {
    expect(contains(CLUB_EVENT_SELECT, field)).toBe(true);
  });

  it("select string matches the field list exactly", () => {
    expect(parse(CLUB_EVENT_SELECT)).toEqual([...CLUB_EVENT_FIELDS]);
  });
});

// ── Private / unnecessary columns are never fetched ────────────────────────
describe("projections exclude private or unnecessary columns", () => {
  const excluded = [
    "latitude",
    "longitude",
    "source_url",
    "source_name",
    "training_schedule",
    "created_at",
    "updated_at",
  ];

  it.each(excluded)("%s is not selected", (field) => {
    expect(contains(CLUB_CARD_SELECT, field)).toBe(false);
    expect(contains(CLUB_DETAIL_SELECT, field)).toBe(false);
  });
});
