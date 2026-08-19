-- Pulse — Replace times_per_week with start_hour / end_hour availability schedule
--
-- The signup form no longer collects "how many times per week" but instead
-- collects an hourly availability window (start_hour, end_hour) per sport so
-- users can be matched with clubs/events whose schedules fit their timetable.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_sports'
  ) THEN
    ALTER TABLE public.user_sports
      DROP COLUMN IF EXISTS times_per_week,
      ADD COLUMN IF NOT EXISTS start_hour smallint CHECK (start_hour BETWEEN 6 AND 21),
      ADD COLUMN IF NOT EXISTS end_hour smallint CHECK (end_hour BETWEEN 7 AND 23);

    COMMENT ON COLUMN public.user_sports.start_hour IS 'Heure de début de disponibilité (0-23) pour ce sport';
    COMMENT ON COLUMN public.user_sports.end_hour IS 'Heure de fin de disponibilité (0-23) pour ce sport';
  END IF;
END $$;
