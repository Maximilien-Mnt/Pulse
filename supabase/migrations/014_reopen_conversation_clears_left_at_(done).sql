-- Pulse V14 — Reopening a conversation restores it to the active list
-- Problem: a conversation soft-deleted by the user (left_at set) is hidden
-- from the list (get_my_conversations_full filters left_at IS NULL), but the
-- search/start-conversation path finds it and opens it anyway. This made the
-- two paths disagree: you could open a conversation that never appeared in
-- the list.
-- Fix: when create_direct_conversation finds an existing 1:1 conversation,
-- clear the caller's left_at so it reappears in the list.

CREATE OR REPLACE FUNCTION public.create_direct_conversation(
  p_other_user_id uuid,
  p_other_is_public_list boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conv_id uuid;
  v_existing_conv_id uuid;
BEGIN
  -- First check if a conversation already exists between these two users
  SELECT cp.conversation_id INTO v_existing_conv_id
  FROM public.conversation_participants cp
  INNER JOIN public.conversations c ON c.id = cp.conversation_id
  WHERE cp.user_id = auth.uid()
    AND c.is_group = false
    AND cp.conversation_id IN (
      SELECT conversation_id
      FROM public.conversation_participants
      WHERE user_id = p_other_user_id
    )
  LIMIT 1;

  -- If conversation already exists, un-delete it for the caller and return it
  IF v_existing_conv_id IS NOT NULL THEN
    UPDATE public.conversation_participants
    SET left_at = NULL
    WHERE conversation_id = v_existing_conv_id AND user_id = auth.uid();
    RETURN v_existing_conv_id;
  END IF;

  -- Create the conversation row
  INSERT INTO public.conversations DEFAULT VALUES
  RETURNING id INTO v_conv_id;

  -- Insert both participants in one statement (bypasses RLS)
  INSERT INTO public.conversation_participants
    (conversation_id, user_id, is_public_list)
  VALUES
    (v_conv_id, auth.uid(), false),
    (v_conv_id, p_other_user_id, p_other_is_public_list)
  ON CONFLICT DO NOTHING;

  RETURN v_conv_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_direct_conversation(uuid, boolean) TO authenticated;