-- Pulse V43 — Club group chats
--
-- Pulse V43 — Club group chats
--
-- When a club is created, a group conversation is automatically created for it
-- When a club is created, a group conversation is automatically created for it
-- and every incoming member (including the creator) is added to it. The chat is
-- named after the club but its name is freely modifiable (only group_name is
-- touched, never the club). A member can leave the club-chat without leaving the
-- club (soft leave via left_at).

-- ─── Link a conversation to a club ──────────────────────────────────────────
-- club_id is nullable (regular 1:1 / group chats have no club). ON DELETE
-- CASCADE removes the chat (and its messages) when the club is deleted.
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS club_id uuid REFERENCES public.clubs (id) ON DELETE CASCADE;

-- ─── Find or create the group chat for a club ───────────────────────────────
-- SECURITY DEFINER so it can be invoked from triggers and can create the
-- conversation row (RLS on conversations would otherwise block non-participants,
-- and there are no participants yet at creation time).
CREATE OR REPLACE FUNCTION public.get_or_create_club_chat(p_club_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conv_id uuid;
  v_club_name text;
  v_club_logo text;
BEGIN
  -- Reuse an existing chat for this club if one already exists.
  SELECT id INTO v_conv_id
  FROM public.conversations
  WHERE club_id = p_club_id
  LIMIT 1;

  IF v_conv_id IS NOT NULL THEN
    RETURN v_conv_id;
  END IF;

  SELECT name, logo_url INTO v_club_name, v_club_logo
  FROM public.clubs
  WHERE id = p_club_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Club introuvable';
  END IF;

  INSERT INTO public.conversations (is_group, group_name, group_photo_url, club_id)
  VALUES (true, v_club_name, v_club_logo, p_club_id)
  RETURNING id INTO v_conv_id;

  RETURN v_conv_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_or_create_club_chat(uuid) TO authenticated;

-- ─── Add a new club member to the club chat ─────────────────────────────────
-- Fires on ANY new club_members row (creator at creation, accepted join
-- requests, redeemed invitations, all upserts) so every member is always
-- present in the group chat. SECURITY DEFINER + ON CONFLICT DO NOTHING bypasses
-- the self-only INSERT policy on conversation_participants.
CREATE OR REPLACE FUNCTION public.add_club_member_to_chat()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conv_id uuid;
BEGIN
  v_conv_id := public.get_or_create_club_chat(NEW.club_id);

  INSERT INTO public.conversation_participants
    (conversation_id, user_id, joined_at)
  VALUES
    (v_conv_id, NEW.user_id, NEW.joined_at)
  ON CONFLICT (conversation_id, user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_club_members_chat_ai
AFTER INSERT ON public.club_members
FOR EACH ROW EXECUTE FUNCTION public.add_club_member_to_chat();

-- ─── Leave a group conversation (chat) WITHOUT leaving the club ─────────────
CREATE OR REPLACE FUNCTION public.leave_group_conversation(p_conv_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me uuid := auth.uid();
  v_is_group boolean;
BEGIN
  SELECT is_group INTO v_is_group
  FROM public.conversations
  WHERE id = p_conv_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conversation introuvable';
  END IF;

  IF v_is_group IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Cette conversation n''est pas un groupe';
  END IF;

  UPDATE public.conversation_participants
  SET left_at = now(), pinned = false, pinned_at = NULL
  WHERE conversation_id = p_conv_id AND user_id = v_me AND left_at IS NULL;

  -- Info message for the remaining participants.
  INSERT INTO public.messages (conversation_id, sender_id, body, type)
  SELECT p_conv_id, v_me, p.full_name || ' a quitté le groupe', 'system'
  FROM public.profiles p
  WHERE p.id = v_me;
END;
$$;

GRANT EXECUTE ON FUNCTION public.leave_group_conversation(uuid) TO authenticated;

-- ─── Include club group chats in the conversation list ──────────────────────
-- Recreate get_my_conversations_full so it no longer filters out group chats
-- (AND c.is_group = false). Group rows simply have other_* = NULL; the client
-- renders group_name / group_photo_url instead of a 1:1 profile.
DROP FUNCTION IF EXISTS public.get_my_conversations_full(boolean);

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
  ORDER BY
    me.pinned DESC,
    me.pinned_at DESC NULLS LAST,
    coalesce(c.last_message_at, c.updated_at) DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_conversations_full(boolean) TO authenticated;