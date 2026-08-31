-- ============================================================================
-- Migration 040: Rewrite post-comments count with exact, self-healing counts
-- ============================================================================
-- Root cause
--   `posts.comments_count` could drift from the real number of rows in
--   `post_comments` because the trigger used incremental +/-1 and was
--   SECURITY INVOKER. Any missed trigger firing, manual edit, or RLS edge case
--   permanently desynchronised it.
--
-- Fix
--   - Recompute the count from the source of truth (`post_comments`) on every
--     insert/delete, running as SECURITY DEFINER so RLS can never swallow it.
--   - New atomic RPCs: `add_post_comment` and `delete_post_comment`, each
--     returning the exact new `comments_count`.
--   - One-time reconciliation of every existing post.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Post counter trigger — SECURITY DEFINER + exact recompute
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.adjust_post_comments_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts
    SET comments_count = (
      SELECT COUNT(*)::int FROM public.post_comments WHERE post_id = NEW.post_id
    )
    WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts
    SET comments_count = (
      SELECT COUNT(*)::int FROM public.post_comments WHERE post_id = OLD.post_id
    )
    WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. One-time reconciliation of posts.comments_count
-- ---------------------------------------------------------------------------
UPDATE public.posts p
SET comments_count = (
  SELECT COUNT(*)::int FROM public.post_comments pc WHERE pc.post_id = p.id
);

-- ---------------------------------------------------------------------------
-- 3. Atomic add-comment RPC returning the exact new state
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.add_post_comment(
  target_post_id uuid,
  comment_body text
)
RETURNS TABLE (comment_id uuid, comments_count int)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_new_id uuid := gen_random_uuid();
BEGIN
  -- Must be an authenticated user.
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED' USING ERRCODE = '28000';
  END IF;

  -- Fail fast when the post does not exist.
  PERFORM 1 FROM public.posts WHERE id = target_post_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'POST_NOT_FOUND' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.post_comments (id, post_id, user_id, body)
  VALUES (v_new_id, target_post_id, v_user, comment_body);

  RETURN QUERY
  SELECT
    v_new_id AS comment_id,
    (SELECT COUNT(*)::int FROM public.post_comments WHERE post_id = target_post_id) AS comments_count;
END;
$$;

REVOKE ALL ON FUNCTION public.add_post_comment(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_post_comment(uuid, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. Atomic delete-comment RPC returning the exact new state
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_post_comment(target_comment_id uuid)
RETURNS TABLE (post_id uuid, comments_count int)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_post_id uuid;
BEGIN
  -- Must be an authenticated user.
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED' USING ERRCODE = '28000';
  END IF;

  -- Only the comment author or the post author may delete a comment.
  SELECT post_id INTO v_post_id
  FROM public.post_comments
  WHERE id = target_comment_id;

  IF v_post_id IS NULL THEN
    RAISE EXCEPTION 'COMMENT_NOT_FOUND' USING ERRCODE = 'P0001';
  END IF;

  DELETE FROM public.post_comments
  WHERE id = target_comment_id
    AND (
      user_id = v_user
      OR EXISTS (
        SELECT 1 FROM public.posts
        WHERE id = v_post_id AND author_id = v_user
      )
    );

  IF NOT FOUND THEN
    RAISE EXCEPTION 'COMMENT_NOT_AUTHORIZED' USING ERRCODE = 'P0002';
  END IF;

  RETURN QUERY
  SELECT
    v_post_id AS post_id,
    (SELECT COUNT(*)::int FROM public.post_comments WHERE post_id = v_post_id) AS comments_count;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_post_comment(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_post_comment(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 5. Drop old trigger and recreate it with the new DEFINER function
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_post_comments_ai ON public.post_comments;
DROP TRIGGER IF EXISTS trg_post_comments_ad ON public.post_comments;

CREATE TRIGGER trg_post_comments_ai
AFTER INSERT ON public.post_comments
FOR EACH ROW EXECUTE FUNCTION public.adjust_post_comments_count();

CREATE TRIGGER trg_post_comments_ad
AFTER DELETE ON public.post_comments
FOR EACH ROW EXECUTE FUNCTION public.adjust_post_comments_count();
