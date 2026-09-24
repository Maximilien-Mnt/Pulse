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
  { key: "sports", column: "sports/sport", private: "ALWAYS", public: "ALWAYS", note: "Multi-select from SPORTS. First selected = primary sport (sport column) for filters, cards and search." },
  { key: "required_levels", column: "required_levels", private: "ALWAYS", public: "ALWAYS", note: "One required predefined or custom level per selected sport. required_level mirrors the primary sport." },
  { key: "short_description", column: "short_description", private: "ALWAYS", public: "ALWAYS", note: "1–200 chars, mandatory. Card / detail lead copy." },
  { key: "description", column: "description", private: "OPTIONAL", public: "OPTIONAL", note: "Up to 2000 chars, optional. Full detail copy." },
  { key: "start_date", column: "start_date", private: "ALWAYS", public: "ALWAYS", note: "Must be in the future." },
  { key: "end_date", column: "end_date", private: "OPTIONAL", public: "OPTIONAL", condition: "If set, must be after start.", note: "Optional in both contexts." },
  { key: "hosting", column: "is_external", private: "ALWAYS", public: "ALWAYS", note: "in_app (default) or external. Never lifts the registration-link requirement." },
  { key: "registration_url", column: "registration_url", private: "ALWAYS", public: "ALWAYS", note: "Mandatory + valid URL in every context. Normalized via normalizeLink." },
  { key: "website_url", column: "website_url", private: "OPTIONAL", public: "OPTIONAL", note: "Valid URL when set." },
  { key: "contact_email", column: "contact_email", private: "OPTIONAL", public: "OPTIONAL", note: "Valid email when set." },
  { key: "venue", column: "venue_address", private: "OPTIONAL", public: "OPTIONAL", note: "Exact street address, free text." },
  { key: "postal_code", column: "postal_code", private: "OPTIONAL", public: "OPTIONAL", note: "Postal code, free text." },
  { key: "league", column: "league", private: "OPTIONAL", public: "OPTIONAL", note: "League / division, free text." },
  { key: "country", column: "country", private: "AUTO", public: "ALWAYS", condition: "Private: auto-filled from profile, never asked.", note: "Public: full COUNTRIES list (searchable), prefilled from profile." },
  { key: "city", column: "city", private: "AUTO", public: "ALWAYS", condition: "Private: auto-filled from profile, never asked.", note: "Public: free text, prefilled from profile." },
  { key: "description", column: "description", private: "OPTIONAL", public: "OPTIONAL", note: "Up to 2000 chars, optional long description." },
  { key: "cover", column: "cover_url", private: "OPTIONAL", public: "OPTIONAL", note: "Dedicated cover image; photos live in hero_urls." },
  { key: "photos", column: "hero_urls", private: "OPTIONAL", public: "OPTIONAL", note: "0–5 photos, each can be added / changed / removed." },
  { key: "places_total", column: "places_total/places_left", private: "OPTIONAL", public: "OPTIONAL", note: "Empty = unlimited. places_left mirrors places_total on insert." },
  { key: "invitees", column: "event_invitations", private: "OPTIONAL", public: "EXCLUDED", note: "Private only: @username multi-select → notify_user." },
  { key: "price", column: "price_cents/is_paid", private: "EXCLUDED", public: "OPTIONAL", note: "Public only. 0/empty = free. is_paid derived." },
  { key: "age_range", column: "age_min/age_max", private: "EXCLUDED", public: "OPTIONAL", condition: "If both set, min ≤ max, 0–99.", note: "Public only." },
  { key: "website_url", column: "website_url", private: "OPTIONAL", public: "OPTIONAL", note: "Valid URL when set, both contexts." },
  // System-managed (never in forms)
  { key: "created_by", column: "created_by", private: "AUTO", public: "AUTO", note: "Authenticated user." },
  { key: "is_private", column: "is_private", private: "AUTO", public: "AUTO", note: "true for private, false for public." },
  { key: "short_description_legacy", column: "short_description", private: "EXCLUDED", public: "EXCLUDED", note: "Legacy: short_description used to be auto-sliced from description." },
  { key: "accepted_count", column: "accepted_count", private: "AUTO", public: "AUTO", note: "Starts at 1 (creator)." },
  { key: "source", column: "source_url/source_name", private: "EXCLUDED", public: "EXCLUDED", note: "Sync pipeline only, never user input." },
];
