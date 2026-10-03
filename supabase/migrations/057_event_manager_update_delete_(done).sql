-- ---------------------------------------------------------------------------
-- Migration 057 — Event management by club owner/admin (UPDATE + DELETE)
-- ---------------------------------------------------------------------------
-- Context:
--   * Events were originally only editable by their creator
--     (`events_update_own`: USING created_by = auth.uid()).
--   * There was no DELETE policy on events at all, so any delete was denied.
--   * Club owner/admins can now publish events through a club
--     (publisher_club_id, migration 048); they must also be able to edit
--     and delete the events they publish.
--
-- Manager definition (mirrors useCanManageEvent / assertCanManageEvent):
--   * the event creator (events.created_by), OR
--   * the owner (clubs.created_by) / admin (club_members.role = 'admin') of
--     the publishing club (publisher_club_id, falling back to club_id).
--
-- RLS recursion is avoided by encapsulating the cross-table check in a
-- SECURITY DEFINER function (owned by postgres / BYPASSRLS) that reuses the
-- existing get_event_publishing_clubs() helper from migration 048. This is the
-- same pattern used in migrations 048/049.

BEGIN;

-- ===========================================================================
-- Helper: user_manages_event — bypasses clubs/club_members/events SELECT RLS
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.user_manages_event(p_event_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = p_event_id
      AND auth.uid() IS NOT NULL
      AND (
        e.created_by = auth.uid()
        OR (
          COALESCE(e.publisher_club_id, e.club_id) IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM public.get_event_publishing_clubs() c
            WHERE c.id = COALESCE(e.publisher_club_id, e.club_id)
          )
        )
      )
  );
$$;
REVOKE ALL ON FUNCTION public.user_manages_event(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_manages_event(uuid) TO authenticated;

-- ===========================================================================
-- Replace the creator-only UPDATE policy with a manager-scoped one
-- ===========================================================================
DROP POLICY IF EXISTS "events_update_own" ON public.events;
DROP POLICY IF EXISTS events_update_own ON events;

DROP POLICY IF EXISTS "events_update_manager" ON public.events;
CREATE POLICY "events_update_manager"
ON public.events FOR UPDATE TO authenticated
USING (public.user_manages_event(events.id))
WITH CHECK (public.user_manages_event(events.id));

-- ===========================================================================
-- Add a manager-scoped DELETE policy (none existed before)
-- ===========================================================================
DROP POLICY IF EXISTS "events_delete_manager" ON public.events;
CREATE POLICY "events_delete_manager"
ON public.events FOR DELETE TO authenticated
USING (public.user_manages_event(events.id));

COMMIT;
