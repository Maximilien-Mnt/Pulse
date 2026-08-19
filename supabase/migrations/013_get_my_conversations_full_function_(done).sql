-- Pulse V13 — Consolidated conversation list RPC
-- Returns everything the conversations tab needs in a single call:
--   conversation fields + participant metadata (pinned, pinned_at, unread, is_public_list)
--   + the other participant's profile (for the 1:1 list title/avatar).
-- SECURITY DEFINER so it bypasses RLS and works even if incidental schema
-- differences exist (e.g. pinned_at added after the function was created).
-- p_is_public_list: true = public list, false = private list, null = all.

CREATE OR REPLACE FUNCTION public.get_my_conversations_full(p_is_public_list boolean)
RETURNS TABLE (
  conversation_id uuid,
  conversation_created_at timestamptz,
  conversation_updated_at timestamptz,
  conversation_last_message_at timestamptz,
  conversation_last_message_preview text,
  conversation_is_group boolean,
  conversation_group_name text,
  conversation_group_photo_url text,
  pinned boolean,
  pinned_at timestamptz,
  unread_count integer,
  is_public_list boolean,
  other_user_id uuid,
  other_full_name text,
  other_username text,
  other_avatar_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id                       AS conversation_id,
    c.created_at               AS conversation_created_at,
    c.updated_at               AS conversation_updated_at,
    c.last_message_at          AS conversation_last_message_at,
    c.last_message_preview     AS conversation_last_message_preview,
    c.is_group                 AS conversation_is_group,
    c.group_name               AS conversation_group_name,
    c.group_photo_url          AS conversation_group_photo_url,
    me.pinned,
    me.pinned_at,
    me.unread_count,
    me.is_public_list,
    other.user_id              AS other_user_id,
    p.full_name                AS other_full_name,
    p.username                 AS other_username,
    p.avatar_url               AS other_avatar_url
  FROM public.conversation_participants me
  INNER JOIN public.conversations c ON c.id = me.conversation_id
  LEFT JOIN LATERAL (
    SELECT ot.user_id
    FROM public.conversation_participants ot
    WHERE ot.conversation_id = me.conversation_id
      AND ot.user_id <> me.user_id
      AND ot.left_at IS NULL
    LIMIT 1
  ) other ON true
  LEFT JOIN public.profiles p ON p.id = other.user_id
  WHERE me.user_id = auth.uid()
    AND me.left_at IS NULL
    AND (p_is_public_list IS NULL OR me.is_public_list = p_is_public_list)
    AND c.is_group = false
  ORDER BY
    me.pinned DESC,
    me.pinned_at DESC NULLS LAST,
    coalesce(c.last_message_at, c.updated_at) DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_conversations_full(boolean) TO authenticated;