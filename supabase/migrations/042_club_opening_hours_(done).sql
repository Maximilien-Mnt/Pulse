-- Pulse V4 — club opening hours ("time available")
--
-- Optional weekly opening-hours schedule set by the club creator/organiser.
-- Stored as a jsonb array of slots using the SAME shape as user_sports.time_slots
-- ({ weekday: 0-6 Monday-first, startHour, endHour }) so upcoming matching
-- features (e.g. "clubs open during my availability") can reuse the same
-- normalization/compare logic.
--
-- Empty array (default) = the club has not configured any hours yet; the UI
-- simply hides the section in that case.

ALTER TABLE public.clubs
  ADD COLUMN IF NOT EXISTS opening_hours jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.clubs
  DROP CONSTRAINT IF EXISTS clubs_opening_hours_is_array;

ALTER TABLE public.clubs
  ADD CONSTRAINT clubs_opening_hours_is_array CHECK (jsonb_typeof(opening_hours) = 'array');

COMMENT ON COLUMN public.clubs.opening_hours IS 'Weekly opening hours: [{weekday (0=Lundi..6=Dimanche), startHour, endHour}] — empty array = not configured';
