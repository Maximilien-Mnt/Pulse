-- Rollback-safe migration: rename created_by FK constraints so PostgREST can resolve them
-- as `profiles!fk_clubs_created_by` and `profiles!fk_events_created_by`.

-- 1. Drop old constraints if they exist
ALTER TABLE public.clubs DROP CONSTRAINT IF EXISTS fk_clubs_created_by;
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS fk_events_created_by;

-- 2. Recreate with explicit names
ALTER TABLE public.clubs
  ADD CONSTRAINT fk_clubs_created_by
  FOREIGN KEY (created_by) REFERENCES public.profiles(id);

ALTER TABLE public.events
  ADD CONSTRAINT fk_events_created_by
  FOREIGN KEY (created_by) REFERENCES public.profiles(id);

</parameter_task_progress>
</write_to_file>