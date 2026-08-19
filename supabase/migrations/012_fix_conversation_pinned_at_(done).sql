-- Pulse V12 — Fix conversation_participants schema
-- Migration 011 was never applied to some environments, breaking the
-- conversations tab (pinned_at column missing → "no conversation" / infinite load).
-- This is idempotent so it can be run safely in any environment.

ALTER TABLE public.conversation_participants
  ADD COLUMN IF NOT EXISTS pinned_at timestamptz;

COMMENT ON COLUMN public.conversation_participants.pinned_at
  IS 'Date du dernier épinglage. NULL = conversation non épinglée.';

-- Recreate delete_conversation_for_me so it works even if migration 011's
-- version was created before the pinned_at column existed (it references
-- pinned_at in an UPDATE and would fail with "column does not exist").
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

  UPDATE public.conversation_participants
  SET left_at = now(), pinned = false, pinned_at = NULL
  WHERE conversation_id = p_conv_id AND user_id = v_me;

  IF v_other IS NOT NULL THEN
    INSERT INTO public.messages (conversation_id, sender_id, body, type)
    VALUES (p_conv_id, v_other, 'La conversation a été supprimée de ton côté.', 'system');
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_conversation_for_me(uuid) TO authenticated;
