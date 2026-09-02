-- Full club deletion with cascade + notifications.
--
-- Deleting a club must also delete all its events (events.club_id has no ON
-- DELETE CASCADE) and notify:
--   - every club member
--   - every participant of the club''s events
-- This SECURITY DEFINER RPC does everything atomically and verifies the caller
-- is the club creator (bypassing RLS deliberately, like notify_user).

CREATE OR REPLACE FUNCTION public.delete_club_full(
  p_club_id uuid,
  p_club_title text,
  p_club_body text,
  p_event_title text,
  p_event_body text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_creator uuid;
  v_member_ids uuid[];
  v_event_ids uuid[];
  v_participant_ids uuid[];
BEGIN
  SELECT created_by INTO v_creator FROM public.clubs WHERE id = p_club_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION ''CLUB_NOT_FOUND'';
  END IF;
  IF v_creator IS NULL OR v_creator <> v_caller THEN
    RAISE EXCEPTION ''UNAUTHORIZED'';
  END IF;

  -- Collect audiences before deletion
  SELECT array_agg(DISTINCT user_id) INTO v_member_ids
    FROM public.club_members WHERE club_id = p_club_id;

  SELECT array_agg(id) INTO v_event_ids
    FROM public.events WHERE club_id = p_club_id;

  IF v_event_ids IS NOT NULL THEN
    SELECT array_agg(DISTINCT user_id) INTO v_participant_ids
      FROM public.event_participants WHERE event_id = ANY(v_event_ids);
  END IF;

  -- Notify club members
  IF v_member_ids IS NOT NULL THEN
    PERFORM public.notify_user(
      p_user_id => m,
      p_type => ''club_deleted'',
      p_title => p_club_title,
      p_body => p_club_body,
      p_data => jsonb_build_object(''club_id'', p_club_id)
    )
    FROM unnest(v_member_ids) AS m
    WHERE m <> v_caller;
  END IF;

  -- Notify event participants who are not already club members
  IF v_participant_ids IS NOT NULL THEN
    PERFORM public.notify_user(
      p_user_id => u,
      p_type => ''event_deleted'',
      p_title => p_event_title,
      p_body => p_event_body,
      p_data => jsonb_build_object(''club_id'', p_club_id)
    )
    FROM unnest(v_participant_ids) AS u
    WHERE u <> v_caller
      AND (v_member_ids IS NULL OR NOT (v_member_ids @> ARRAY[u]));
  END IF;

  -- Delete the club''s events (explicit child cleanup for safety, then events)
  IF v_event_ids IS NOT NULL THEN
    DELETE FROM public.event_join_requests WHERE event_id = ANY(v_event_ids);
    DELETE FROM public.event_favorites WHERE event_id = ANY(v_event_ids);
    DELETE FROM public.event_participants WHERE event_id = ANY(v_event_ids);
    DELETE FROM public.events WHERE id = ANY(v_event_ids);
  END IF;

  -- Delete the club (FK cascades: club_members, club_favorites,
  -- club_join_requests, club group conversations per migration 043)
  DELETE FROM public.clubs WHERE id = p_club_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_club_full(uuid, text, text, text, text) TO authenticated;
