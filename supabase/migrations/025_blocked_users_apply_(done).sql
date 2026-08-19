-- ---------------------------------------------------------------------------
-- Pulse — Apply blocked_users table (idempotent)
--
-- Migration 020 created this table but was never applied to the live
-- database (project eqrhjmuaaaarjxuprjaj). The app queries `blocked_users`
-- unconditionally (feed, block user, create conversation, public content),
-- so its absence makes the feed throw "Impossible de charger le feed".
--
-- This migration is completely safe to run multiple times.
-- ---------------------------------------------------------------------------

-- Create the table if it does not exist yet
CREATE TABLE IF NOT EXISTS public.blocked_users (
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocker ON public.blocked_users(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked ON public.blocked_users(blocked_id);

-- RLS: users can only manage their own blocks
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

-- Policies (idempotent — only create if they don't already exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'blocked_users'
      AND policyname = 'Users can insert their own blocks'
  ) THEN
    CREATE POLICY "Users can insert their own blocks"
      ON public.blocked_users
      FOR INSERT
      WITH CHECK (auth.uid() = blocker_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'blocked_users'
      AND policyname = 'Users can view their own blocks'
  ) THEN
    CREATE POLICY "Users can view their own blocks"
      ON public.blocked_users
      FOR SELECT
      USING (auth.uid() = blocker_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'blocked_users'
      AND policyname = 'Users can delete their own blocks'
  ) THEN
    CREATE POLICY "Users can delete their own blocks"
      ON public.blocked_users
      FOR DELETE
      USING (auth.uid() = blocker_id);
  END IF;
END $$;