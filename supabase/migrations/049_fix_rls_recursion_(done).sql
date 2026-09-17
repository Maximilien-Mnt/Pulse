-- ---------------------------------------------------------------------------
-- Migration 049 — Fix RLS infinite recursion (DEFECT-1 from audit)
-- ---------------------------------------------------------------------------
-- The club_members <-> clubs and event_participants <-> events SELECT policies
-- created in migration 047 reference each other's tables directly, causing
-- PostgreSQL error 42P17 (infinite recursion) on every authenticated SELECT.
--
-- Fix: extract the cross-table membership checks into SECURITY DEFINER helper
-- functions (owned by postgres, which has BYPASSRLS) so the policy subqueries
-- bypass RLS and the circular reference is broken.
--
-- Pattern matches migration 048's get_event_publishing_clubs() /
-- get_event_club_publishers() functions.

BEGIN;

-- ===========================================================================
-- Helper: user_is_club_member — bypasses club_members_select RLS
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.user_is_club_member(p_club_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.club_members cm
    WHERE cm.club_id = p_club_id AND cm.user_id = auth.uid()
  );
$$;
REVOKE ALL ON FUNCTION public.user_is_club_member(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_is_club_member(uuid) TO authenticated;

-- ===========================================================================
-- Helper: user_is_event_participant — bypasses event_participants_select RLS
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.user_is_event_participant(p_event_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.event_participants ep
    WHERE ep.event_id = p_event_id AND ep.user_id = auth.uid()
  );
$$;
REVOKE ALL ON FUNCTION public.user_is_event_participant(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_is_event_participant(uuid) TO authenticated;

-- ===========================================================================
-- Rewrite clubs_select to use the helper function (avoids club_members subquery)
-- ===========================================================================
DROP POLICY IF EXISTS clubs_select ON clubs;

CREATE POLICY clubs_select
ON clubs
FOR SELECT
TO authenticated
USING (
    is_private = false
    OR created_by = auth.uid()
    OR public.user_is_club_member(clubs.id)
);

-- ===========================================================================
-- Rewrite club_members_select to use the helper function for the self-join
-- (the original JOIN club_members cm2 caused direct self-recursion)
-- ===========================================================================
DROP POLICY IF EXISTS club_members_select ON club_members;

CREATE POLICY club_members_select
ON club_members
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.clubs c
        WHERE c.id = club_members.club_id
          AND c.is_private = false
    )
    OR EXISTS (
        SELECT 1 FROM public.clubs c2
        WHERE c2.id = club_members.club_id
          AND c2.is_private = true
          AND public.user_is_club_member(c2.id)
    )
    OR EXISTS (
        SELECT 1 FROM public.clubs c3
        WHERE c3.id = club_members.club_id
          AND c3.created_by = auth.uid()
    )
);

-- ===========================================================================
-- Rewrite events_select to use the helper function
-- ===========================================================================
DROP POLICY IF EXISTS events_select ON events;

CREATE POLICY events_select
ON events
FOR SELECT
TO authenticated
USING (
    is_private = false
    OR created_by = auth.uid()
    OR public.user_is_event_participant(events.id)
);

-- ===========================================================================
-- Rewrite event_participants_select to use the helper function for the self-join
-- ===========================================================================
DROP POLICY IF EXISTS event_participants_select ON event_participants;

CREATE POLICY event_participants_select
ON event_participants
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.events e
        WHERE e.id = event_participants.event_id
          AND e.is_private = false
    )
    OR EXISTS (
        SELECT 1 FROM public.events e2
        WHERE e2.id = event_participants.event_id
          AND e2.is_private = true
          AND public.user_is_event_participant(e2.id)
    )
    OR EXISTS (
        SELECT 1 FROM public.events e3
        WHERE e3.id = event_participants.event_id
          AND e3.created_by = auth.uid()
    )
);

COMMIT;
