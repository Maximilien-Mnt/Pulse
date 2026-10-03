-- ---------------------------------------------------------------------------
-- Migration 058 — Club member status (statut réel dans le club)
-- ---------------------------------------------------------------------------
-- Context:
--   * `club_members.role` is the TECHNICAL permission role (owner/admin/member)
--     used by RLS and permission helpers (see migrations 048/049/057).
--   * Members need a SEPARATE, human-facing "status in the club" (Président,
--     Coach, Joueur, Bénévole…). This migration adds `member_status` +
--     `custom_member_status` (for the "Autre" free-text status).
--
-- Authorization rule for managing members (status change / removal):
--   * the club owner (clubs.created_by), OR
--   * a technical admin (club_members.role = 'admin'), OR
--   * a member whose member_status belongs to the "Direction / gestion"
--     category (president, vice_president, treasurer, secretary, manager,
--     general_manager).
--
-- Security: no permissive UPDATE/DELETE policy is added on club_members —
-- every write goes through the SECURITY DEFINER RPCs below so:
--   * authorization is enforced server-side (never trust the UI),
--   * the old status is read, the new status is written and the notification
--     is inserted in a single transaction (no partial updates),
--   * the technical owner can never be edited/removed by a lower level.
--
-- Reversal (down migration):
--   DROP FUNCTION IF EXISTS public.remove_club_member_secure(uuid, uuid, text, text);
--   DROP FUNCTION IF EXISTS public.update_club_member_status(uuid, uuid, text, text, text, text);
--   DROP FUNCTION IF EXISTS public.user_can_manage_club_members(uuid);
--   DROP FUNCTION IF EXISTS public.management_member_statuses();
--   DROP INDEX IF EXISTS public.idx_club_members_status;
--   ALTER TABLE public.club_members DROP CONSTRAINT IF EXISTS club_members_custom_status_check;
--   ALTER TABLE public.club_members DROP COLUMN IF EXISTS custom_member_status;
--   ALTER TABLE public.club_members DROP COLUMN IF EXISTS member_status;
-- ---------------------------------------------------------------------------

BEGIN;

-- ===========================================================================
-- 1. Columns + constraints
-- ===========================================================================

-- Default 'active_member' ("Membre actif") for every existing and future row.
ALTER TABLE public.club_members
  ADD COLUMN IF NOT EXISTS member_status text NOT NULL DEFAULT 'active_member';

ALTER TABLE public.club_members
  ADD COLUMN IF NOT EXISTS custom_member_status text;

-- Constraint: 'other' requires a non-empty custom status (1..60 chars after
-- trimming); any other status must have custom_member_status = NULL.
ALTER TABLE public.club_members
  DROP CONSTRAINT IF EXISTS club_members_custom_status_check;

ALTER TABLE public.club_members
  ADD CONSTRAINT club_members_custom_status_check CHECK (
    (
      member_status = 'other'
      AND custom_member_status IS NOT NULL
      AND char_length(btrim(custom_member_status)) BETWEEN 1 AND 60
    )
    OR
    (
      member_status <> 'other'
      AND custom_member_status IS NULL
    )
  );

CREATE INDEX IF NOT EXISTS idx_club_members_status
  ON public.club_members (club_id, member_status);

-- ===========================================================================
-- 2. Helper: the "Direction / gestion" statuses (mirrors lib/clubMemberStatus.ts)
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.management_member_statuses()
RETURNS text[]
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT ARRAY[
    'president',
    'vice_president',
    'treasurer',
    'secretary',
    'manager',
    'general_manager'
  ]::text[];
$$;

REVOKE ALL ON FUNCTION public.management_member_statuses() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.management_member_statuses() TO authenticated;


-- ===========================================================================
-- 3. Helper: can the caller manage members of this club?
--    (owner OR technical admin OR member with a "Direction / gestion" status)
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.user_can_manage_club_members(p_club_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    EXISTS (
      SELECT 1 FROM public.clubs c
      WHERE c.id = p_club_id AND c.created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.club_members cm
      WHERE cm.club_id = p_club_id
        AND cm.user_id = auth.uid()
        AND (
          cm.role IN ('owner', 'admin')
          OR cm.member_status = ANY (public.management_member_statuses())
        )
    );
$$;

REVOKE ALL ON FUNCTION public.user_can_manage_club_members(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_can_manage_club_members(uuid) TO authenticated;

-- ===========================================================================
-- 4. RPC: change a member's status (atomic update + notification)
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.update_club_member_status(
  p_club_id uuid,
  p_member_id uuid,
  p_member_status text,
  p_custom_member_status text,   -- NULL unless p_member_status = 'other'
  p_title text,
  p_body text
)
RETURNS TABLE(previous_status text, new_status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_owner uuid;
  v_target_role text;
  v_old text;
  v_custom text := NULLIF(btrim(coalesce(p_custom_member_status, '')), '');
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  IF NOT public.user_can_manage_club_members(p_club_id) THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  -- Nobody can edit their own status row (anti self-escalation).
  IF p_member_id = v_caller THEN
    RAISE EXCEPTION 'CANNOT_EDIT_SELF';
  END IF;

  SELECT created_by INTO v_owner FROM public.clubs WHERE id = p_club_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'CLUB_NOT_FOUND';
  END IF;

  SELECT role, member_status INTO v_target_role, v_old
  FROM public.club_members
  WHERE club_id = p_club_id AND user_id = p_member_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'MEMBER_NOT_FOUND';
  END IF;

  -- The technical owner is protected from lower levels.
  IF v_target_role = 'owner' OR p_member_id = v_owner THEN
    RAISE EXCEPTION 'CANNOT_EDIT_OWNER';
  END IF;

  -- Validation
  IF p_member_status IS NULL OR btrim(p_member_status) = '' THEN
    RAISE EXCEPTION 'INVALID_STATUS';
  END IF;

  IF p_member_status = 'other' AND v_custom IS NULL THEN
    RAISE EXCEPTION 'CUSTOM_REQUIRED';
  END IF;

  IF length(v_custom) > 60 THEN
    RAISE EXCEPTION 'CUSTOM_TOO_LONG';
  END IF;

  UPDATE public.club_members
  SET member_status = p_member_status,
      custom_member_status = CASE
        WHEN p_member_status = 'other' THEN v_custom
        ELSE NULL
      END
  WHERE club_id = p_club_id AND user_id = p_member_id;

  -- Notify only on a real change.
  IF v_old IS DISTINCT FROM p_member_status THEN
    PERFORM public.notify_user(
      p_user_id => p_member_id,
      p_type    => 'club_member_status_changed',
      p_title   => p_title,
      p_body    => p_body,
      p_data    => jsonb_build_object(
        'club_id', p_club_id,
        'member_status', p_member_status,
        'previous_member_status', v_old,
        'deep_link', '/clubs/' || p_club_id::text || '/members'
      )
    );
  END IF;

  RETURN QUERY SELECT v_old, p_member_status;
END;
$$;

REVOKE ALL ON FUNCTION public.update_club_member_status(uuid, uuid, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_club_member_status(uuid, uuid, text, text, text, text) TO authenticated;

-- ===========================================================================
-- 5. RPC: remove a member (atomic delete + notification)
--    Replaces the previous direct DELETE (which RLS only allowed for self).
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.remove_club_member_secure(
  p_club_id uuid,
  p_member_id uuid,
  p_title text,
  p_body text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_owner uuid;
  v_target_role text;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  IF NOT public.user_can_manage_club_members(p_club_id) THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  IF p_member_id = v_caller THEN
    RAISE EXCEPTION 'CANNOT_REMOVE_SELF';
  END IF;

  SELECT created_by INTO v_owner FROM public.clubs WHERE id = p_club_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'CLUB_NOT_FOUND';
  END IF;

  SELECT role INTO v_target_role
  FROM public.club_members
  WHERE club_id = p_club_id AND user_id = p_member_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'MEMBER_NOT_FOUND';
  END IF;

  IF v_target_role = 'owner' OR p_member_id = v_owner THEN
    RAISE EXCEPTION 'CANNOT_REMOVE_OWNER';
  END IF;

  DELETE FROM public.club_members
  WHERE club_id = p_club_id AND user_id = p_member_id;

  PERFORM public.notify_user(
    p_user_id => p_member_id,
    p_type    => 'club_member_removed',
    p_title   => p_title,
    p_body    => p_body,
    p_data    => jsonb_build_object(
      'club_id', p_club_id,
      'club_name', (SELECT name FROM public.clubs WHERE id = p_club_id)
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.remove_club_member_secure(uuid, uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.remove_club_member_secure(uuid, uuid, text, text) TO authenticated;

COMMIT;
