-- ============================================================================
-- Migration 039: Rewrite post-likes system with exact, self-healing counts
-- ============================================================================
-- Root cause
--   `posts.likes_count` drifted away from the real number of rows in
--   `post_likes` (e.g. stored 0 but actually 1 like). Two compounding bugs:
--
--     1. The trigger function `adjust_post_likes_count()` was SECURITY INVOKER.
--        When a NON-author liked a post, the trigger's
--        `UPDATE posts SET likes_count = likes_count + 1` ran under RLS
--        (`posts_update_own` → author_id = auth.uid()) so it silently updated
--        0 rows. The counter only ever went up for the author's own self-likes.
--
--     2. The counter used incremental +/-1, so any missed trigger, manual edit
--        or bad seed permanently desynchronised it from the real data.
--
-- Fix
--   - Recompute the count from the source of truth (`post_likes`) on every
--     insert/delete, running as SECURITY DEFINER so RLS can never swallow it.
--   - One-time reconciliation of every existing post.
--   - New atomic `toggle_post_like(target_post_id)` RPC: one call likes or
--     unlikes for `auth.uid()` and returns the exact new `{ liked, likes_count }`.
--     The composite PK (post_id, user_id) guarantees at most one like per user.
--   - Same treatment for `user_stats.total_likes_received` (author totals),
--     which suffered the identical RLS bug.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Post counter trigger — SECURITY DEFINER + exact recompute
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.adjust_post_likes_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts
    SET likes_count = (
      SELECT COUNT(*)::int FROM public.post_likes WHERE post_id = NEW.post_id
    )
    WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts
    SET likes_count = (
      SELECT COUNT(*)::int FROM public.post_likes WHERE post_id = OLD.post_id
    )
    WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. One-time reconciliation of posts.likes_count
-- ---------------------------------------------------------------------------
UPDATE public.posts p
SET likes_count = (
  SELECT COUNT(*)::int FROM public.post_likes pl WHERE pl.post_id = p.id
);

-- ---------------------------------------------------------------------------
-- 3. Atomic like/unlike RPC returning the exact new state
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.toggle_post_like(target_post_id uuid)
RETURNS TABLE (liked boolean, likes_count int)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_exists uuid;
  v_liked boolean;
BEGIN
  -- Must be an authenticated user.
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED' USING ERRCODE = '28000';
  END IF;

  -- Fail fast with a clean error when the post does not exist.
  SELECT id INTO v_exists FROM public.posts WHERE id = target_post_id;
  IF v_exists IS NULL THEN
    RAISE EXCEPTION 'POST_NOT_FOUND' USING ERRCODE = 'P0001';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.post_likes
    WHERE post_id = target_post_id AND user_id = v_user
  ) INTO v_liked;

  IF v_liked THEN
    -- Unlike.
    DELETE FROM public.post_likes
    WHERE post_id = target_post_id AND user_id = v_user;
  ELSE
    -- Like. The composite PK (post_id, user_id) guarantees at most one like
    -- per user; ON CONFLICT keeps it idempotent.
    INSERT INTO public.post_likes (post_id, user_id)
    VALUES (target_post_id, v_user)
    ON CONFLICT (post_id, user_id) DO NOTHING;
  END IF;

  -- Return the exact, freshly computed state.
  RETURN QUERY
  SELECT
    NOT v_liked AS liked,
    (SELECT COUNT(*)::int FROM public.post_likes WHERE post_id = target_post_id) AS likes_count;
END;
$$;

REVOKE ALL ON FUNCTION public.toggle_post_like(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.toggle_post_like(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. Author-stats trigger (total_likes_received) — same RLS bug, same fix
-- ---------------------------------------------------------------------------
-- The previous refresh_author_likes_received() was SECURITY INVOKER, so when a
-- non-author liked a post the `UPDATE user_stats` (RLS: user_id = auth.uid())
-- silently affected 0 rows and the author's total_likes_received drifted too.
-- Rewrite as SECURITY DEFINER and recompute the exact count.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.refresh_author_likes_received()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_author uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT author_id INTO v_author FROM public.posts WHERE id = NEW.post_id;
    IF v_author IS NOT NULL THEN
      UPDATE public.user_stats
      SET total_likes_received = (
        SELECT COUNT(*)::int
        FROM public.post_likes pl
        JOIN public.posts p ON p.id = pl.post_id
        WHERE p.author_id = v_author
      )
      WHERE user_id = v_author;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    SELECT author_id INTO v_author FROM public.posts WHERE id = OLD.post_id;
    IF v_author IS NOT NULL THEN
      UPDATE public.user_stats
      SET total_likes_received = (
        SELECT COUNT(*)::int
        FROM public.post_likes pl
        JOIN public.posts p ON p.id = pl.post_id
        WHERE p.author_id = v_author
      )
      WHERE user_id = v_author;
    END IF;
  END IF;
  RETURN NULL;
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. Reconcile existing user_stats.total_likes_received
-- ---------------------------------------------------------------------------
UPDATE public.user_stats us
SET total_likes_received = (
  SELECT COUNT(*)::int
  FROM public.post_likes pl
  JOIN public.posts p ON p.id = pl.post_id
  WHERE p.author_id = us.user_id
);