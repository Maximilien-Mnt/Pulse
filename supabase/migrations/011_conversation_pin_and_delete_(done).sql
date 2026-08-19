-- Pulse V11 — conversation pin (with timestamp) and per-user soft delete
-- Pin: add pinned_at to order pinned conversations by pin recency.
-- Delete: soft-delete for the calling user only (set left_at), so the
-- conversation and its messages remain visible to the other participant.
-- A system message is inserted to inform the other participant.

-- ─── pinned_at ──────────────────────────────────────────────────────────────
ALTER TABLE public.conversation_participants
  ADD COLUMN IF NOT EXISTS pinned_at timestamptz;

COMMENT ON COLUMN public.conversation_participants.pinned_at
  IS 'Date du dernier épinglage. NULL = conversation non épinglée.';

-- ─── Soft delete for the current user ───────────────────────────────────────
-- SECURITY DEFINER so the function can insert a system message on behalf of
-- the *other* participant (RLS insert policy only allows the caller's own
-- sender_id) and update the user's own participant row.
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
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_conversation_for_me(uuid) TO authenticated;