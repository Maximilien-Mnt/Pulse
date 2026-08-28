-- Pulse V4 — club cover image support
-- Add cover_url column to clubs table

ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS cover_url text;
