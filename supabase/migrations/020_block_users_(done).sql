-- ---------------------------------------------------------------------------
-- BLOCKED USERS
-- Allows a user to block another user, preventing:
-- - Seeing their posts in feed
-- - Seeing their clubs/events
-- - Starting conversations
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.blocked_users (
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocker ON public.blocked_users(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked ON public.blocked_users(blocked_id);

-- RLS: users can only manage their own blocks
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own blocks"
  ON public.blocked_users
  FOR INSERT
  WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Users can view their own blocks"
  ON public.blocked_users
  FOR SELECT
  USING (auth.uid() = blocker_id);

CREATE POLICY "Users can delete their own blocks"
  ON public.blocked_users
  FOR DELETE
  USING (auth.uid() = blocker_id);