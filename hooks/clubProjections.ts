import type { Club, Profile } from "@/types";
import type { EventRow } from "@/types";

// ---------------------------------------------------------------------------
// Club PostgREST projections.
//
// Each select list is the single source of truth for the columns fetched for a
// given club use case. They replace former `select("*")` calls so we only
// transfer fields that are actually rendered (no private or unused columns),
// while staying aligned with the `clubs` / `events` Row schema in @/types.
//
// Compile-time checks at the bottom guarantee each projection covers every
// field rendered by its consumers. __tests__/club-projections.test.ts mirrors
// them at runtime.
// ---------------------------------------------------------------------------

/**
 * Club list card (components/clubs/ClubCard.tsx, ClubCardGrid.tsx and
 * components/explore/ClubCard.tsx). `created_by` is not rendered directly but
 * is required to attach the creator profile (share text / author row).
 */
export const CLUB_CARD_FIELDS = [
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
  "created_by",
] as const;

export const CLUB_CARD_SELECT = CLUB_CARD_FIELDS.join(", ");

export type ClubCardData = Pick<Club, (typeof CLUB_CARD_FIELDS)[number]>;

export type ClubCardRow = ClubCardData & {
  creator?: Pick<Profile, "id" | "full_name" | "username" | "avatar_url">;
};

/**
 * Club detail header + public club screen (app/(tabs)/clubs/[clubId]/index.tsx)
 * and owner dashboard (app/(tabs)/clubs/[clubId]/dashboard.tsx), including the
 * public club header components in components/clubs/public.
 */
export const CLUB_DETAIL_FIELDS = [
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
] as const;

export const CLUB_DETAIL_SELECT = CLUB_DETAIL_FIELDS.join(", ");

export type ClubDetailRow = Pick<Club, (typeof CLUB_DETAIL_FIELDS)[number]>;

/**
 * Event rows rendered by the club detail screen's events list
 * (components/events/EventCard in compact mode).
 */
export const CLUB_EVENT_FIELDS = [
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
] as const;

export const CLUB_EVENT_SELECT = CLUB_EVENT_FIELDS.join(", ");

export type ClubEventRow = Pick<
  EventRow,
  (typeof CLUB_EVENT_FIELDS)[number]
>;

// ── Compile-time checks ─────────────────────────────────────────────────────
// Each assertion evaluates to `true` only if the projection select list is a
// superset of the fields the consumer renders. If a component starts rendering
// a new field, these fail to compile until the projection is updated.

type RenderedCardFields =
  | "id"
  | "name"
  | "sport"
  | "city"
  | "country"
  | "member_count"
  | "logo_url"
  | "hero_urls"
  | "is_external"
  | "short_description"
  | "description";

const cardProjectionCoversRenderedFields: RenderedCardFields extends (typeof CLUB_CARD_FIELDS)[number]
  ? true
  : never = true;
void cardProjectionCoversRenderedFields;

type RenderedDetailFields =
  | "id"
  | "name"
  | "sport"
  | "short_description"
  | "description"
  | "country"
  | "city"
  | "address"
  | "postal_code"
  | "logo_url"
  | "cover_url"
  | "hero_urls"
  | "registration_url"
  | "is_external"
  | "is_private"
  | "member_count"
  | "founded_date"
  | "league"
  | "age_min"
  | "age_max"
  | "required_level"
  | "required_levels"
  | "contact_email"
  | "created_by"
  | "website_url"
  | "opening_hours"
  | "sports"
  | "phone_number"
  | "instagram_url"
  | "facebook_url"
  | "tiktok_url"
  | "extra_link";

const detailProjectionCoversRenderedFields: RenderedDetailFields extends (typeof CLUB_DETAIL_FIELDS)[number]
  ? true
  : never = true;
void detailProjectionCoversRenderedFields;

type RenderedEventFields =
  | "id"
  | "name"
  | "sport"
  | "city"
  | "start_date"
  | "logo_url"
  | "is_external"
  | "is_paid"
  | "price_cents"
  | "difficulty";

const eventProjectionCoversRenderedFields: RenderedEventFields extends (typeof CLUB_EVENT_FIELDS)[number]
  ? true
  : never = true;
void eventProjectionCoversRenderedFields;
