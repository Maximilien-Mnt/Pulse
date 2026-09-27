-- ============================================================================
-- Migration 041: Rewrite subscribers (followers) count with exact, self-healing counts
-- ============================================================================
-- Root cause
--   `user_stats.followers_count` / `following_count` never updated correctly:
--     1. The `refresh_follow_counts` trigger was SECURITY INVOKER, and RLS
--        (`user_stats_own_write`) only allows a user to write their OWN stats
--        row. So when user A follows user B, the trigger could update A's
--        `following_count` but silently failed to update B's
--        `followers_count` (the UPDATE matched 0 rows under RLS).
--     2. Counts used blind +/-1 arithmetic, so any missed firing drifted them
--        permanently.
--     3. The `refresh_all_user_stats()` RPC called hourly by the
--        `update-user-stats` edge function did not exist.
--
-- Fix (same pattern as migration 040 for post comments):
--   - Recompute the counts exactly from the source of truth (`follows`) on
--     every insert/delete, running as SECURITY DEFINER so RLS can never
--     swallow the update.
--   - Self-heal missing `user_stats` rows.
--   - One-time reconciliation of every user's current counts.
--   - Create the missing `refresh_all_user_stats()` RPC.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Follow counter trigger — SECURITY DEFINER + exact recompute
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.refresh_follow_counts()
RETURNS TRIGGER AS $$
DECLARE
  fid uuid;
  tid uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    fid := NEW.follower_id;
    tid := NEW.following_id;
  ELSE
    fid := OLD.follower_id;
    tid := OLD.following_id;
  END IF;

  -- Self-heal: ensure stats rows exist for both affected users.
  INSERT INTO public.user_stats (user_id) VALUES (fid) ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.user_stats (user_id) VALUES (tid) ON CONFLICT (user_id) DO NOTHING;

  -- Lifetime counters (cannot be derived from the `follows` table).
  IF TG_OP = 'INSERT' THEN
    UPDATE public.user_stats
    SET historical_follows_count = historical_follows_count + 1, updated_at = now()
    WHERE user_id = tid;
  ELSE
    UPDATE public.user_stats
    SET unfollows_count = unfollows_count + 1, updated_at = now()
    WHERE user_id = tid;
  END IF;

  -- Recompute current counts exactly from `follows` (drift-proof).
  UPDATE public.user_stats
  SET following_count = (
        SELECT COUNT(*)::int FROM public.follows f WHERE f.follower_id = fid
      ),
      updated_at = now()
  WHERE user_id = fid;

  UPDATE public.user_stats
  SET followers_count = (
        SELECT COUNT(*)::int FROM public.follows f WHERE f.following_id = tid
      ),
      updated_at = now()
  WHERE user_id = tid;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_follows_counts ON public.follows;

CREATE TRIGGER trg_follows_counts
AFTER INSERT OR DELETE ON public.follows
FOR EACH ROW EXECUTE FUNCTION public.refresh_follow_counts();

-- ---------------------------------------------------------------------------
-- 2. Missing RPC used by the `update-user-stats` edge function (hourly cron)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.refresh_all_user_stats()
RETURNS void AS $$
BEGIN
  UPDATE public.user_stats us
  SET
    followers_count = (
      SELECT COUNT(*)::int FROM public.follows f WHERE f.following_id = us.user_id
    ),
    following_count = (
      SELECT COUNT(*)::int FROM public.follows f WHERE f.follower_id = us.user_id
    ),
    posts_count = (
      SELECT COUNT(*)::int FROM public.posts p WHERE p.author_id = us.user_id
    ),
    clubs_created_count = (
      SELECT COUNT(*)::int FROM public.clubs c WHERE c.created_by = us.user_id
    ),
    events_created_count = (
      SELECT COUNT(*)::int FROM public.events e WHERE e.created_by = us.user_id
    ),
    total_likes_received = (
      SELECT COUNT(*)::int
      FROM public.post_likes pl
      JOIN public.posts p ON p.id = pl.post_id
      WHERE p.author_id = us.user_id
    ),
    total_comments_received = (
      SELECT COUNT(*)::int
      FROM public.post_comments pc
      JOIN public.posts p ON p.id = pc.post_id
      WHERE p.author_id = us.user_id
    ),
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.refresh_all_user_stats() TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. One-time reconciliation of every user's current follow counts
-- ---------------------------------------------------------------------------

UPDATE public.user_stats us
SET
  followers_count = (
    SELECT COUNT(*)::int FROM public.follows f WHERE f.following_id = us.user_id
  ),
  following_count = (
    SELECT COUNT(*)::int FROM public.follows f WHERE f.follower_id = us.user_id
  ),
  updated_at = now();

-- ---------------------------------------------------------------------------
-- 4. Lock down EXECUTE (trigger fn must not be RPC-callable; the RPC is for
--    the edge function's service role only)
-- ---------------------------------------------------------------------------

REVOKE EXECUTE ON FUNCTION public.refresh_follow_counts() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.refresh_all_user_stats() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_all_user_stats() TO service_role;
