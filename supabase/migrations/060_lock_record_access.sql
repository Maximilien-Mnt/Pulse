-- ---------------------------------------------------------------------------
-- Migration 060 — Lock record access (hardening RLS + FORCE RLS)
-- ---------------------------------------------------------------------------
-- Context:
--   Pulse holds personal data (profiles, follows, user stats, sports,
--   objectives, conversations, messages). RLS is enabled on all 32 tables
--   but several SELECT policies still expose rows to *every* authenticated
--   account, and only 5 tables use FORCE ROW LEVEL SECURITY.
--   This migration tightens record-level access so a user can only read the
--   rows they own or that the row owner opted to share publicly.
--
-- Changes:
--   1. FORCE ROW LEVEL SECURITY on every table that has RLS (defense in depth
--      so table-owner / superuser contexts cannot bypass policies).
--   2. profiles_select — own profile, or public-profile rows (not blocked).
--      Replaces `USING (deleted_at IS NULL)` which exposed every profile to
--      every authenticated account.
--   3. follows_select — own follower/following rows, or follows of public
--      profiles. Replaces `USING (true)` which exposed the entire social graph.
--   4. user_stats_select — own stats, or stats of public profiles.
--      Replaces `USING (true)`.
--   5. Idempotent: DROP POLICY IF EXISTS / CREATE POLICY; safe to replay.
-- ---------------------------------------------------------------------------

BEGIN;

-- ===========================================================================
-- 1. FORCE ROW LEVEL SECURITY on all tables that already have RLS enabled.
-- ===========================================================================

ALTER TABLE public.profiles                       FORCE ROW LEVEL SECURITY;
ALTER TABLE public.user_sports                    FORCE ROW LEVEL SECURITY;
ALTER TABLE public.user_objectives                FORCE ROW LEVEL SECURITY;
ALTER TABLE public.follows                        FORCE ROW LEVEL SECURITY;
ALTER TABLE public.clubs                          FORCE ROW LEVEL SECURITY;
ALTER TABLE public.club_members                   FORCE ROW LEVEL SECURITY;
ALTER TABLE public.club_favorites                 FORCE ROW LEVEL SECURITY;
ALTER TABLE public.club_join_requests             FORCE ROW LEVEL SECURITY;
ALTER TABLE public.events                         FORCE ROW LEVEL SECURITY;
ALTER TABLE public.event_participants             FORCE ROW LEVEL SECURITY;
ALTER TABLE public.event_favorites                FORCE ROW LEVEL SECURITY;
ALTER TABLE public.event_join_requests            FORCE ROW LEVEL SECURITY;
ALTER TABLE public.posts                          FORCE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes                     FORCE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments                  FORCE ROW LEVEL SECURITY;
ALTER TABLE public.comment_likes                  FORCE ROW LEVEL SECURITY;
ALTER TABLE public.conversations                  FORCE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants      FORCE ROW LEVEL SECURITY;
ALTER TABLE public.messages                       FORCE ROW LEVEL SECURITY;
ALTER TABLE public.message_reactions              FORCE ROW LEVEL SECURITY;
ALTER TABLE public.message_hidden                 FORCE ROW LEVEL SECURITY;
ALTER TABLE public.reports                        FORCE ROW LEVEL SECURITY;
ALTER TABLE public.notifications                  FORCE ROW LEVEL SECURITY;
ALTER TABLE public.user_stats                     FORCE ROW LEVEL SECURITY;
ALTER TABLE public.feed_interactions              FORCE ROW LEVEL SECURITY;
ALTER TABLE public.bug_reports                    FORCE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_users                  FORCE ROW LEVEL SECURITY;
-- V3 tables already FORCED in 059; re-assert here for convergence on replay.
ALTER TABLE public.external_clubs                 FORCE ROW LEVEL SECURITY;
ALTER TABLE public.external_events                FORCE ROW LEVEL SECURITY;
ALTER TABLE public.invitation_tokens              FORCE ROW LEVEL SECURITY;
ALTER TABLE public.search_history                 FORCE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings                  FORCE ROW LEVEL SECURITY;


-- ===========================================================================
-- 2. profiles_select — own profile, or public-profile rows (not blocked).
-- ===========================================================================

DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;

CREATE POLICY "profiles_select_authenticated"
ON public.profiles
FOR SELECT
TO authenticated
USING (
    id = auth.uid()
    OR (
        is_public_profile = true
        AND deleted_at IS NULL
        AND NOT EXISTS (
            SELECT 1 FROM public.blocked_users bu
            WHERE bu.blocker_id = auth.uid()
              AND bu.blocked_id = public.profiles.id
        )
    )
);


-- ===========================================================================
-- 3. follows_select — own follower/following rows, or follows of public
--    profiles.
-- ===========================================================================

DROP POLICY IF EXISTS "follows_select" ON public.follows;

CREATE POLICY "follows_select"
ON public.follows
FOR SELECT
TO authenticated
USING (
    follower_id = auth.uid()
    OR following_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = public.follows.following_id
          AND p.is_public_profile = true
          AND p.deleted_at IS NULL
          AND NOT EXISTS (
              SELECT 1 FROM public.blocked_users bu
              WHERE bu.blocker_id = auth.uid()
                AND bu.blocked_id = public.follows.following_id
          )
    )
);

-- ===========================================================================
-- 4. user_stats_select — own stats, or stats of public profiles.
-- ===========================================================================

DROP POLICY IF EXISTS "user_stats_select" ON public.user_stats;

CREATE POLICY "user_stats_select"
ON public.user_stats
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = public.user_stats.user_id
          AND p.is_public_profile = true
          AND p.deleted_at IS NULL
    )
);


-- ===========================================================================
-- 5. clubs_update — creator OR club owner/admin (mirrors migration 057 for
--    events). Previously only `created_by = auth.uid()` could update a club;
--    now the club's owner (`clubs.created_by`) and any `club_members` with
--    role `admin` can update, using `get_event_publishing_clubs()` from
--    migration 048 (SECURITY DEFINER) to avoid RLS recursion.
-- ===========================================================================

DROP POLICY IF EXISTS "clubs_update_creator" ON public.clubs;

CREATE POLICY "clubs_update_manager"
ON public.clubs
FOR UPDATE
TO authenticated
USING (
    created_by = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.get_event_publishing_clubs() c
        WHERE c.id = public.clubs.id
    )
)
WITH CHECK (
    created_by = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.get_event_publishing_clubs() c
        WHERE c.id = public.clubs.id
    )
);

COMMIT;
