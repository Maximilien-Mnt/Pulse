-- Club creation form extra fields
-- Adds multi-sport support, per-sport required levels and extended contact/social fields.

-- Multi-sport: the primary sport stays in `sport` (used by discover filter, badges, SQL
-- index). `sports` holds the full list of the club's practiced sports.
ALTER TABLE public.clubs
  ADD COLUMN IF NOT EXISTS sports text[] NOT NULL DEFAULT '{}',
  -- JSON map of { sportId: requiredLevel } for the per-sport required level.
  -- e.g. {"football":"Régional","tennis":"Intermédiaire"}
  ADD COLUMN IF NOT EXISTS required_levels jsonb;

-- Extended contact & social fields
ALTER TABLE public.clubs
  ADD COLUMN IF NOT EXISTS postal_code text,
  ADD COLUMN IF NOT EXISTS phone_number text,
  ADD COLUMN IF NOT EXISTS instagram_url text,
  ADD COLUMN IF NOT EXISTS facebook_url text,
  ADD COLUMN IF NOT EXISTS tiktok_url text,
  -- Additional optional link (extra social or other relevant page)
  ADD COLUMN IF NOT EXISTS extra_link text;

-- Backfill the multi-sport array from the existing single sport for old rows
-- and keep any new rows consistent (they always set `sports` explicitly).
UPDATE public.clubs
SET sports = ARRAY[sport]
WHERE cardinality(sports) = 0 AND sport IS NOT NULL AND sport <> '';