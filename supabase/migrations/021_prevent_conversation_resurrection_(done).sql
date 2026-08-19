-- Pulse V21 — prevent deleted conversations from being resurrected
--
-- Problem: migration 014 made create_direct_conversation reopen deleted
-- conversations by clearing left_at. This caused a deleted 1:1 thread to
-- come back when the user tried to start a new conversation with the same
-- person.
--
-- Fix: replace create_direct_conversation with a version that always
-- creates a new conversation. Reuse is now handled only in the app hooks
-- for active conversations; deleted ones cannot be resurrected.

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
BEGIN
  INSERT INTO public.conversations DEFAULT VALUES
  RETURNING id INTO v_conv_id;

  INSERT INTO public.conversation_participants
    (conversation_id, user_id, is_public_list)
  VALUES
    (v_conv_id, auth.uid(), false),
    (v_conv_id, p_other_user_id, p_other_is_public_list);

  RETURN v_conv_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_direct_conversation(uuid, boolean) TO authenticated;
