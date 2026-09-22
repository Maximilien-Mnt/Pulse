-- Pulse — rich event creation fields (additive, rollback-safe)
-- Adds multi-sport support with per-sport required levels, plus the optional
-- contact / logistics / media fields requested for every event creation form.
--
-- Multi-sport: the primary sport stays in `sport` (used by the discover filter,
-- cards, search and SQL indexes). `sports` holds the full list of sports the
-- event covers, and `required_levels` maps each of them to its required level.
-- Mirrors the club columns introduced by 044_club_extra_fields.

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS sports text[] NOT NULL DEFAULT '{}',
  -- JSON map of { sportId: requiredLevel }, e.g. {"football":"Régional"}
  ADD COLUMN IF NOT EXISTS required_levels jsonb;

-- Optional logistics / contact fields
ALTER TABLE public.events
  -- Full venue address (exact street address). `venue_address` holds it today.
  ADD COLUMN IF NOT EXISTS postal_code text,
  ADD COLUMN IF NOT EXISTS contact_email text,
  -- League / division the event belongs to (e.g. "Nationale 2 - Poule A")
  ADD COLUMN IF NOT EXISTS league text;

-- Optional media: dedicated cover image, independent from the 0–5 hero photos.
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS cover_url text;

-- Backfill the multi-sport array from the existing single sport for old rows
-- and keep new rows consistent (the creation forms always set `sports`).
UPDATE public.events
SET sports = ARRAY[sport]
WHERE cardinality(sports) = 0 AND sport IS NOT NULL AND sport <> '';

-- Backfill the legacy single required_level into the per-sport map so existing
-- rows keep rendering their level on the detail page.
UPDATE public.events
SET required_levels = jsonb_build_object(sport, required_level)
WHERE required_levels IS NULL
  AND required_level IS NOT NULL
  AND btrim(required_level) <> ''
  AND sport IS NOT NULL
  AND sport <> '';
