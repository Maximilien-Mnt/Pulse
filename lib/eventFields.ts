// ---------------------------------------------------------------------------
// PULSE — Official event field specification
//
// Single source of truth for every event creation context.
// Private events stay minimal by design (invite-only, light form).
// Public events are rich (discoverable, searchable, filterable).
//
// Legend: ALWAYS = mandatory | CONDITIONAL = mandatory in some cases | OPTIONAL
// ---------------------------------------------------------------------------

export type EventVisibility = "private" | "public";
export type EventCreationContext =
  | { visibility: "private"; publisher: "personal" | "club" }
  | { visibility: "public"; publisher: "personal" | "club" };

export type FieldRule = "ALWAYS" | "CONDITIONAL" | "OPTIONAL" | "AUTO" | "EXCLUDED";

export interface EventFieldSpec {
  key: string;
  column: string | null;
  private: FieldRule;
  public: FieldRule;
  condition?: string;
  note?: string;
}

export const EVENT_FIELD_SPECS: EventFieldSpec[] = [
  { key: "publisher", column: "publisher_club_id/club_id", private: "ALWAYS", public: "ALWAYS", note: "Personal profile or administered club. Preselected when created from a club." },
  { key: "name", column: "name", private: "ALWAYS", public: "ALWAYS", note: "1–80 chars." },
  { key: "sport", column: "sport", private: "ALWAYS", public: "ALWAYS", note: "Single sport from SPORTS." },
  { key: "start_date", column: "start_date", private: "ALWAYS", public: "ALWAYS", note: "Must be in the future." },
  { key: "end_date", column: "end_date", private: "OPTIONAL", public: "OPTIONAL", condition: "If set, must be after start.", note: "Optional in both contexts." },
  { key: "hosting", column: "is_external", private: "ALWAYS", public: "ALWAYS", note: "in_app (default) or external." },
  { key: "registration_url", column: "registration_url", private: "CONDITIONAL", public: "CONDITIONAL", condition: "Mandatory + valid URL when hosting = external.", note: "Normalized via normalizeLink." },
  { key: "venue", column: "venue_address", private: "OPTIONAL", public: "OPTIONAL", note: "Free-text place / address." },
  { key: "country", column: "country", private: "AUTO", public: "ALWAYS", condition: "Private: auto-filled from profile, never asked.", note: "Public: full COUNTRIES list (searchable), prefilled from profile." },
  { key: "city", column: "city", private: "AUTO", public: "ALWAYS", condition: "Private: auto-filled from profile, never asked.", note: "Public: free text, prefilled from profile." },
  { key: "description", column: "description", private: "OPTIONAL", public: "ALWAYS", condition: "Public: min 50 chars with live counter.", note: "short_description auto = first 100 chars." },
  { key: "photos", column: "hero_urls", private: "OPTIONAL", public: "OPTIONAL", note: "0–5 photos, first = cover." },
  { key: "places_total", column: "places_total/places_left", private: "OPTIONAL", public: "OPTIONAL", note: "Empty = unlimited. places_left mirrors places_total on insert." },
  { key: "invitees", column: "event_invitations", private: "OPTIONAL", public: "EXCLUDED", note: "Private only: @username multi-select → notify_user." },
  { key: "price", column: "price_cents/is_paid", private: "EXCLUDED", public: "OPTIONAL", note: "Public only. 0/empty = free. is_paid derived." },
  { key: "category", column: "category", private: "EXCLUDED", public: "OPTIONAL", note: "Public only: EVENT_CATEGORIES chips." },
  { key: "required_level", column: "required_level", private: "EXCLUDED", public: "OPTIONAL", note: "Public only: free text + level suggestions." },
  { key: "difficulty", column: "difficulty", private: "EXCLUDED", public: "OPTIONAL", note: "Public only: slider 1–5, default 3." },
  { key: "age_range", column: "age_min/age_max", private: "EXCLUDED", public: "OPTIONAL", condition: "If both set, min ≤ max, 0–99.", note: "Public only." },
  { key: "website_url", column: "website_url", private: "EXCLUDED", public: "OPTIONAL", note: "Public only: valid URL when set." },
  // System-managed (never in forms)
  { key: "created_by", column: "created_by", private: "AUTO", public: "AUTO", note: "Authenticated user." },
  { key: "is_private", column: "is_private", private: "AUTO", public: "AUTO", note: "true for private, false for public." },
  { key: "short_description", column: "short_description", private: "AUTO", public: "AUTO", note: "Auto-sliced from description." },
  { key: "accepted_count", column: "accepted_count", private: "AUTO", public: "AUTO", note: "Starts at 1 (creator)." },
  { key: "source", column: "source_url/source_name", private: "EXCLUDED", public: "EXCLUDED", note: "Sync pipeline only, never user input." },
];
