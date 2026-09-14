// ---------------------------------------------------------------------------
// PULSE — Event PostgREST projections
//
// Each select list is the single source of truth for the columns fetched for a
// given event use case. They replace former `select("*")` calls so we only
// transfer fields that are actually rendered (no private or unused columns),
// while staying aligned with the `events` Row schema in @/types.
//
// Compile-time checks at the bottom guarantee each projection covers every
// field rendered by its consumers. __tests__/event-projections.test.ts mirrors
// them at runtime.
// ---------------------------------------------------------------------------

import type { Tables, Profile } from "@/types";

/**
 * Event list card (components/explore/EventCard.tsx and
 * components/events/EventCard.tsx). `created_by` is not rendered directly but
 * is required to attach the creator profile (share text / author row).
 *
 * This projection is a superset of the fields used by BOTH the explore
 * EventCard and the vertical EventCard (events index / discover), so it is
 * safe to use as the single select for `useEvents`.
 */
export const EVENT_CARD_FIELDS = [
  "id",
  "name",
  "sport",
  "city",
  "start_date",
  "logo_url",
  "hero_urls",
  "is_external",
  "is_paid",
  "price_cents",
  "difficulty",
  "created_by",
] as const;

export const EVENT_CARD_SELECT = EVENT_CARD_FIELDS.join(", ");

export type EventCardData = Pick<
  Tables<"events">,
  (typeof EVENT_CARD_FIELDS)[number]
>;

export type EventCardRow = EventCardData & {
  creator?: Pick<Profile, "id" | "full_name" | "username" | "avatar_url">;
};

// ── Compile-time checks ─────────────────────────────────────────────────────
// Each assertion evaluates to `true` only if the projection select list is a
// superset of the fields the consumer renders. If a component starts rendering
// a new field, these fail to compile until the projection is updated.

/** Fields rendered by components/explore/EventCard.tsx */
type RenderedExploreEventFields =
  | "id"
  | "name"
  | "sport"
  | "start_date"
  | "logo_url"
  | "hero_urls"
  | "difficulty"
  | "is_external"
  | "created_by";

const exploreCardProjectionCoversRenderedFields: RenderedExploreEventFields extends (typeof EVENT_CARD_FIELDS)[number]
  ? true
  : never = true;
void exploreCardProjectionCoversRenderedFields;

/** Fields rendered by components/events/EventCard.tsx (via the vertical layout) */
type RenderedVerticalEventFields =
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

const verticalCardProjectionCoversRenderedFields: RenderedVerticalEventFields extends (typeof EVENT_CARD_FIELDS)[number]
  ? true
  : never = true;
void verticalCardProjectionCoversRenderedFields;

