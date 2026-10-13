-- ---------------------------------------------------------------------------
-- Migration 059 — Enable missing RLS + scope remaining open read policies
-- ---------------------------------------------------------------------------
-- Context
--   A cross-check of every `CREATE TABLE` (32 distinct) against every
--   `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` (27 distinct) in
--   supabase/migrations/ showed five tables created by 003_v3.sql whose RLS
--   policies were declared but whose RLS was NEVER ENABLED. In PostgreSQL a
--   policy is INERT until `ENABLE ROW LEVEL SECURITY` is set on the table, so
--   on those tables `anon`/`authenticated` reach every row through PostgREST
--   with no policy enforcement at all — even though correctly-authored
--   policies exist in the same file.
--
--   Separately, two SELECT policies from 001_initial.sql are still
--   `USING (true)`, exposing every user's sports list, objectives and
--   availability time-slots to any authenticated account, which contradicts
--   the private-by-default model (signup sets is_public_profile = false) that
--   migrations 035/047 established.
--
--   `conversations_select_participant` is also re-asserted here: migration
--   051 documents that the LIVE database carries a fully-permissive
--   `USING (true)` variant of this policy (drift applied directly on the
--   database, not via any migration file). This migration restores the
--   intended participant-only predicate so replaying the migration set on a
--   drifted database converges it back to the correct state.
--
-- Idempotency: every statement is DROP-IF-EXISTS / ENABLE / CREATE, so this
-- file is safe to replay (matches the hardened-001 replay property asserted
-- by .github/workflows/migration-replay.yml).
-- ---------------------------------------------------------------------------

BEGIN;

-- ===========================================================================
-- 1. Enable RLS on the five tables whose policies were declared but never
--    enforced. This is the primary fix: it makes the EXISTING policies live.
-- ===========================================================================

ALTER TABLE public.external_clubs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_events   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitation_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_history    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings     ENABLE ROW LEVEL SECURITY;

-- FORCE RLS so the table OWNER is also subject to the policies. Without it a
-- postgres/superuser context (e.g. a SECURITY DEFINER helper that is not
-- owner-bypassed correctly, or the table creator) silently reads every row.
ALTER TABLE public.external_clubs    FORCE ROW LEVEL SECURITY;
ALTER TABLE public.external_events   FORCE ROW LEVEL SECURITY;
ALTER TABLE public.invitation_tokens FORCE ROW LEVEL SECURITY;
ALTER TABLE public.search_history    FORCE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings     FORCE ROW LEVEL SECURITY;

-- ===========================================================================
-- 2. user_sports — was `FOR SELECT TO authenticated USING (true)`
--    Scope to: own rows, OR the row owner opted into a public profile.
--    hooks/usePublicProfile.ts reads another user's user_sports, so the
--    public-profile branch must stay readable (blocked users excluded, to
--    match the pattern already used in 047 for posts/comments).
-- ===========================================================================

DROP POLICY IF EXISTS "user_sports_select" ON public.user_sports;

CREATE POLICY "user_sports_select"
ON public.user_sports
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = user_sports.user_id
          AND p.is_public_profile = true
          AND p.deleted_at IS NULL
          AND NOT EXISTS (
              SELECT 1 FROM public.blocked_users bu
              WHERE bu.blocker_id = auth.uid()
                AND bu.blocked_id = user_sports.user_id
          )
    )
);

-- ===========================================================================
-- 3. user_objectives — was `FOR SELECT TO authenticated USING (true)`
--    Same scoping as user_sports.
-- ===========================================================================

DROP POLICY IF EXISTS "user_objectives_select" ON public.user_objectives;

CREATE POLICY "user_objectives_select"
ON public.user_objectives
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = user_objectives.user_id
          AND p.is_public_profile = true
          AND p.deleted_at IS NULL
          AND NOT EXISTS (
              SELECT 1 FROM public.blocked_users bu
              WHERE bu.blocker_id = auth.uid()
                AND bu.blocked_id = user_objectives.user_id
          )
    )
);

-- ===========================================================================
-- 4. conversations — re-assert the participant-only SELECT policy.
--
--    Migration 051's SECURITY CAVEAT records that the live database carries
--    `conversations_select_participant ... FOR SELECT TO public USING (true)`
--    (drift applied out-of-band). It deliberately deferred the fix because
--    tightening the SELECT grant is an app-wide change. This migration is
--    that change: it restores the intended predicate AND narrows the role
--    from `public` to `authenticated`, so realtime broadcasts and direct
--    /rest/v1/conversations reads both require active participation.
-- ===========================================================================

DROP POLICY IF EXISTS "conversations_select_participant" ON public.conversations;

CREATE POLICY "conversations_select_participant"
ON public.conversations
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.conversation_participants cp
  WHERE cp.conversation_id = id
    AND cp.user_id = auth.uid()
    AND cp.left_at IS NULL
));

-- ===========================================================================
-- 5. check_username_available — was granted to `anon, authenticated`
--    (001_initial.sql:83), making it an unauthenticated username-enumeration
--    oracle. The app calls it from the signup flow
--    (app/auth/signup/step1.tsx:53) BEFORE the user has a session, so `anon`
--    cannot simply be revoked without breaking signup.
--
--    Applied here: drop the implicit PUBLIC grant (which `TO anon` implies)
--    and grant explicitly to `authenticated` only. The remaining
--    pre-session availability check still needs a route: the follow-up is to
--    move it behind the signup edge function (service-role) or add per-IP
--    throttling. See the note at the bottom of this file.
-- ===========================================================================

REVOKE EXECUTE ON FUNCTION public.check_username_available(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_username_available(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.check_username_available(text) TO authenticated;

COMMIT;

-- ---------------------------------------------------------------------------
-- FOLLOW-UP (not done here, requires an app/product change)
--   The signup flow calls check_username_available before a session exists
--   (app/auth/signup/step1.tsx:53), so revoking `anon` above will make that
--   live-availability hint return null on web until one of these lands:
--     (a) route the check through the public `signup` edge function
--         (already verify_jwt=false) using the service-role client, or
--     (b) add per-IP rate limiting + CAPTCHA in the Supabase Auth dashboard
--         (already required per supabase/config.toml:6-9).
--   The step1 caller already degrades gracefully: `if (error) {
--   setUsernameOk(null); return; }` — a denied RPC shows no hint rather than
--   blocking submission, and the edge function still rejects taken usernames
--   with the generic SIGNUP_FAILED code (no enumeration).
--
-- Reversal (down migration)
-- ---------------------------------------------------------------------------
-- ALTER TABLE public.external_clubs    DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.external_events   DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.invitation_tokens DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.search_history    DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.user_settings     DISABLE ROW LEVEL SECURITY;
--
-- CREATE POLICY "user_sports_select" ON public.user_sports
--   FOR SELECT TO authenticated USING (true);
-- CREATE POLICY "user_objectives_select" ON public.user_objectives
--   FOR SELECT TO authenticated USING (true);
-- ---------------------------------------------------------------------------
