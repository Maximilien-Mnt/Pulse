-- Add category column to user_sports table
-- Categories: 'practiced' (sports practiced) and 'interested' (sports interested in)

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_sports'
  ) THEN
    -- Add category column if it doesn't exist
    ALTER TABLE public.user_sports 
      ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'practiced';

    -- Drop old unique constraint if it exists
    ALTER TABLE public.user_sports 
      DROP CONSTRAINT IF EXISTS user_sports_user_id_sport_id_key;

    -- Add new unique constraint with category
    ALTER TABLE public.user_sports 
      ADD CONSTRAINT user_sports_user_sport_category_unique 
      UNIQUE (user_id, sport_id, category);

    -- Create index for better query performance
    CREATE INDEX IF NOT EXISTS idx_user_sports_user_category 
      ON public.user_sports(user_id, category);
  END IF;
END $$;
