-- ---------------------------------------------------------------------------
-- PULSE — Edit Post Comment RPC + hardened Delete
--
-- 1. Adds an `updated_at` column to `post_comments` for tracking edits.
-- 2. Creates an atomic `edit_post_comment` function that:
--      - Verifies the calling user owns the comment
--      - Updates the body and sets updated_at
--      - Returns the updated comment row
-- 3. Recreates `delete_post_comment` as SECURITY DEFINER so RLS can never
--      silently swallow the internal DELETE. Authorization (comment author
--      OR post author) is enforced explicitly inside the function.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 1. Ensure `post_comments.updated_at` exists and is populated
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'post_comments' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.post_comments
      ADD COLUMN updated_at timestamptz;

    -- Set default value for existing rows
    UPDATE public.post_comments SET updated_at = created_at WHERE updated_at IS NULL;
  END IF;
END $$;

-- Auto-maintain updated_at ONLY when the comment body changes, so the
-- like-counter trigger (which bumps likes_count via an UPDATE on
-- post_comments) never falsely marks a comment as "modified".
CREATE OR REPLACE FUNCTION public.set_post_comment_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.body IS DISTINCT FROM OLD.body THEN
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_post_comments_updated_at ON public.post_comments;
CREATE TRIGGER trg_post_comments_updated_at
  BEFORE UPDATE ON public.post_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.set_post_comment_updated_at();

-- ---------------------------------------------------------------------------
-- 2. Atomic edit-comment RPC (author-only)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.edit_post_comment(
  target_comment_id uuid,
  new_body text
)
RETURNS TABLE (
  id uuid,
  post_id uuid,
  user_id uuid,
  body text,
  likes_count int,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_comment RECORD;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED' USING ERRCODE = '28000';
  END IF;

  -- Fetch the comment and verify ownership
  SELECT c.id, c.post_id, c.user_id, c.likes_count, c.created_at
  INTO v_comment
  FROM public.post_comments c
  WHERE c.id = target_comment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'COMMENT_NOT_FOUND' USING ERRCODE = 'P0001';
  END IF;

  IF v_comment.user_id != v_user_id THEN
    RAISE EXCEPTION 'COMMENT_NOT_AUTHORIZED' USING ERRCODE = 'P0002';
  END IF;

  -- Update the comment
  UPDATE public.post_comments c
  SET body = new_body
  WHERE c.id = target_comment_id;

  -- Return the updated row
  RETURN QUERY
  SELECT
    c.id,
    c.post_id,
    c.user_id,
    c.body,
    c.likes_count::int,
    c.created_at,
    c.updated_at
  FROM public.post_comments c
  WHERE c.id = target_comment_id;
END;
$$;

REVOKE ALL ON FUNCTION public.edit_post_comment(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.edit_post_comment(uuid, text) TO authenticated;

COMMENT ON FUNCTION public.edit_post_comment(uuid, text) IS
  'Atomically edit a post comment. Only the comment author can edit.';

-- ---------------------------------------------------------------------------
-- 3. Recreate delete-comment RPC as SECURITY DEFINER
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_post_comment(target_comment_id uuid)
RETURNS TABLE (post_id uuid, comments_count int)
LANGUAGE plpgsql
SECURITY DEFINER
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
  SELECT c.post_id INTO v_post_id
  FROM public.post_comments c
  WHERE c.id = target_comment_id;

  IF v_post_id IS NULL THEN
    RAISE EXCEPTION 'COMMENT_NOT_FOUND' USING ERRCODE = 'P0001';
  END IF;

  DELETE FROM public.post_comments c
  WHERE c.id = target_comment_id
    AND (
      c.user_id = v_user
      OR EXISTS (
        SELECT 1 FROM public.posts p
        WHERE p.id = v_post_id AND p.author_id = v_user
      )
    );

  IF NOT FOUND THEN
    RAISE EXCEPTION 'COMMENT_NOT_AUTHORIZED' USING ERRCODE = 'P0002';
  END IF;

  RETURN QUERY
  SELECT
    v_post_id AS post_id,
    (SELECT COUNT(*)::int FROM public.post_comments c2 WHERE c2.post_id = v_post_id) AS comments_count;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_post_comment(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_post_comment(uuid) TO authenticated;

COMMENT ON FUNCTION public.delete_post_comment(uuid) IS
  'Atomically delete a post comment (author or post author). Returns the new count.';
