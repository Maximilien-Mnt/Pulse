-- Add category column to user_sports table
-- Categories: 'practiced' (sports practiced) and 'interested' (sports interested in)

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'user_sports'
  ) THEN

    ALTER TABLE public.user_sports
      ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'practiced';

    -- Remove duplicate rows, keeping the first row in each duplicate group
    DELETE FROM public.user_sports a
    USING public.user_sports b
    WHERE a.ctid < b.ctid
      AND a.user_id = b.user_id
      AND a.sport_id = b.sport_id
      AND a.category = b.category;

    ALTER TABLE public.user_sports
      DROP CONSTRAINT IF EXISTS user_sports_user_id_sport_id_key;

    ALTER TABLE public.user_sports
      ADD CONSTRAINT user_sports_user_sport_category_unique
      UNIQUE (user_id, sport_id, category);

    CREATE INDEX IF NOT EXISTS idx_user_sports_user_category
      ON public.user_sports(user_id, category);
  END IF;
END $$;
