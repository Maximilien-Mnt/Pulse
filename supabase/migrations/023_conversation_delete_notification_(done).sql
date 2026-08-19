-- Pulse V23 — Conversation Deletion Notification
-- When a user deletes a conversation, the other participant receives a notification
-- in their notification center to inform them.

-- Drop and recreate the function with notification support
DROP FUNCTION IF EXISTS public.delete_conversation_for_me(uuid);

CREATE OR REPLACE FUNCTION public.delete_conversation_for_me(p_conv_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me uuid := auth.uid();
  v_other uuid;
BEGIN
  -- Ensure the caller is an active participant; grab a co-participant (if any)
  SELECT other.user_id INTO v_other
  FROM public.conversation_participants me
  JOIN public.conversation_participants other
    ON other.conversation_id = me.conversation_id AND other.user_id <> me.user_id
  WHERE me.conversation_id = p_conv_id
    AND me.user_id = v_me
    AND me.left_at IS NULL
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conversation introuvable ou accès refusé';
  END IF;

  -- Soft-delete for the calling user only
  UPDATE public.conversation_participants
  SET left_at = now(), pinned = false, pinned_at = NULL
  WHERE conversation_id = p_conv_id AND user_id = v_me;

  -- Notify the other active participant with a system message
  IF v_other IS NOT NULL THEN
    INSERT INTO public.messages (conversation_id, sender_id, body, type)
    VALUES (p_conv_id, v_other, 'La conversation a été supprimée de ton côté.', 'system');

    -- Send a notification to the user's notification center
    PERFORM public.notify_user(
      p_user_id => v_other,
      p_type => 'conversation_deleted',
      p_title => 'Conversation supprimée',
      p_body => 'Une conversation a été supprimée de votre côté.',
      p_data => jsonb_build_object(
        'conversation_id', p_conv_id
      )
    );
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_conversation_for_me(uuid) TO authenticated;