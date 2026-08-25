-- Pulse — Replace weekdays/start_hour/end_hour with JSONB time_slots
-- Each slot: { weekday: number, startHour: number, endHour: number }

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_sports'
  ) THEN
    -- Add time_slots column if missing
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'user_sports' AND column_name = 'time_slots'
    ) THEN
      ALTER TABLE public.user_sports
        ADD COLUMN time_slots jsonb NOT NULL DEFAULT '[]'::jsonb;
    END IF;

    -- Backfill: migrate old start_hour/end_hour into one slot per row (keep old columns until after backfill)
    UPDATE public.user_sports
      SET time_slots = COALESCE(
        (
          SELECT jsonb_build_array(
            jsonb_build_object(
              'weekday', COALESCE((weekdays -> 0)::int, 1),
              'startHour', start_hour,
              'endHour', end_hour
            )
          )
        ),
        '[]'::jsonb
      )
    WHERE (time_slots IS NULL OR time_slots = '[]'::jsonb)
      AND start_hour IS NOT NULL
      AND end_hour IS NOT NULL;

    -- Drop old columns
    ALTER TABLE public.user_sports
      DROP COLUMN IF EXISTS weekdays,
      DROP COLUMN IF EXISTS start_hour,
      DROP COLUMN IF EXISTS end_hour;

    COMMENT ON COLUMN public.user_sports.time_slots IS 'JSONB array of { weekday: number, startHour: number, endHour: number }';
  END IF;
END $$;
