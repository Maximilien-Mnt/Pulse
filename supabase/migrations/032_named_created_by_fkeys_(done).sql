-- Fix: add explicit named foreign key constraints for created_by relationships
-- so PostgREST can resolve relationships like profiles!fk_<table>_created_by

-- Drop existing auto-named constraints on clubs.created_by if they exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'clubs' AND constraint_name = 'clubs_created_by_fkey'
  ) THEN
    ALTER TABLE public.clubs DROP CONSTRAINT clubs_created_by_fkey;
  END IF;
END $$;

-- Drop existing auto-named constraints on events.created_by if they exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'events' AND constraint_name = 'events_created_by_fkey'
  ) THEN
    ALTER TABLE public.events DROP CONSTRAINT events_created_by_fkey;
  END IF;
END $$;

-- Re-create with explicit, predictable constraint names
ALTER TABLE public.clubs
  ADD CONSTRAINT fk_clubs_created_by
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.events
  ADD CONSTRAINT fk_events_created_by
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;