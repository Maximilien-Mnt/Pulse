-- ---------------------------------------------------------------------------
-- Migration 047 — Privacy & Authorization Audit Fixes
-- ---------------------------------------------------------------------------
-- Closes defects identified during the comprehensive audit of RLS, Storage,
-- and client flows.
-- 
-- Fixed:
--   DEFECT-1: Storage "conversation-files" read had no owner check
--   DEFECT-2: Table "posts" SELECT was open to all authenticated users
--   DEFECT-3: Table "post_comments" SELECT was open to all authenticated users
--   DEFECT-4: Tables clubs, club_members, events, event_participants exposed
--              private entities
--   DEFECT-5: Table "follows" exposed full social graph
--   DEFECT-6: Tables reports/bug_reviews have no admin view (documented gap)
-- ---------------------------------------------------------------------------

BEGIN;

-- ===========================================================================
-- 1. STORAGE: Fix "conversation-files" bucket read policy
-- ===========================================================================

DROP POLICY IF EXISTS "Conversation files read participant"
    ON storage.objects;

CREATE POLICY "Conversation files read owner"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'conversation-files'
    AND (
        owner = auth.uid()
        OR (storage.foldername(name))[1] = auth.uid()::text
    )
);

-- ===========================================================================
-- 2. TABLE "posts" — restrict SELECT to public-profile authors + own posts
-- ===========================================================================

DROP POLICY IF EXISTS posts_select
    ON posts;

CREATE POLICY posts_select
ON posts
FOR SELECT
TO authenticated
USING (
    author_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = posts.author_id
          AND p.is_public_profile = true
          AND p.deleted_at IS NULL
          AND NOT EXISTS (
              SELECT 1 FROM blocked_users bu
              WHERE bu.blocker_id = auth.uid()
                AND bu.blocked_id = posts.author_id
          )
    )
);


-- ===========================================================================
-- 3. TABLE "post_comments" — mirror post visibility via join
-- ===========================================================================

DROP POLICY IF EXISTS post_comments_select
    ON post_comments;

CREATE POLICY post_comments_select
ON post_comments
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM posts po
        JOIN profiles pr ON pr.id = po.author_id
        WHERE po.id = post_comments.post_id
          AND (
              po.author_id = auth.uid()
              OR (
                  pr.is_public_profile = true
                  AND pr.deleted_at IS NULL
                  AND NOT EXISTS (
                      SELECT 1 FROM blocked_users bu2
                      WHERE bu2.blocker_id = auth.uid()
                        AND bu2.blocked_id = po.author_id
                  )
              )
          )
    )
);

-- ===========================================================================
-- 4a. TABLE "clubs" — hide private clubs from non-members
-- ===========================================================================

DROP POLICY IF EXISTS clubs_select
    ON clubs;

CREATE POLICY clubs_select
ON clubs
FOR SELECT
TO authenticated
USING (
    is_private = false
    OR created_by = auth.uid()
    OR EXISTS (
        SELECT 1 FROM club_members cm
        WHERE cm.club_id = clubs.id
          AND cm.user_id = auth.uid()
    )
);


-- ===========================================================================
-- 4b. TABLE "club_members" — membership list follows club visibility
-- ===========================================================================

DROP POLICY IF EXISTS club_members_select
    ON club_members;

CREATE POLICY club_members_select
ON club_members
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM clubs c
        WHERE c.id = club_members.club_id
          AND c.is_private = false
    )
    OR EXISTS (
        SELECT 1 FROM clubs c2
        JOIN club_members cm2 ON cm2.club_id = c2.id AND cm2.user_id = auth.uid()
        WHERE c2.id = club_members.club_id
          AND c2.is_private = true
    )
    OR EXISTS (
        SELECT 1 FROM clubs c3
        WHERE c3.id = club_members.club_id
          AND c3.created_by = auth.uid()
    )
);

-- ===========================================================================
-- 4c. TABLE "events" — hide private events from non-participants
-- ===========================================================================

DROP POLICY IF EXISTS events_select
    ON events;

CREATE POLICY events_select
ON events
FOR SELECT
TO authenticated
USING (
    is_private = false
    OR created_by = auth.uid()
    OR EXISTS (
        SELECT 1 FROM event_participants ep
        WHERE ep.event_id = events.id
          AND ep.user_id = auth.uid()
    )
);

-- ===========================================================================
-- 4d. TABLE "event_participants" — follows event visibility
-- ===========================================================================

DROP POLICY IF EXISTS event_participants_select
    ON event_participants;

CREATE POLICY event_participants_select
ON event_participants
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM events e
        WHERE e.id = event_participants.event_id
          AND e.is_private = false
    )
    OR EXISTS (
        SELECT 1 FROM events e2
        JOIN event_participants ep2 ON ep2.event_id = e2.id AND ep2.user_id = auth.uid()
        WHERE e2.id = event_participants.event_id
          AND e2.is_private = true
    )
    OR EXISTS (
        SELECT 1 FROM events e3
        WHERE e3.id = event_participants.event_id
          AND e3.created_by = auth.uid()
    )
);

-- ===========================================================================
-- 5. TABLE "follows" — reduce graph exposure
-- ===========================================================================

DROP POLICY IF EXISTS follows_select
    ON follows;

CREATE POLICY follows_select
ON follows
FOR SELECT
TO authenticated
USING (
    follower_id = auth.uid()
    OR following_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM profiles pf
        WHERE pf.id = follows.follower_id AND pf.is_public_profile = true
    )
    OR EXISTS (
        SELECT 1 FROM profiles pfg
        WHERE pfg.id = follows.following_id AND pfg.is_public_profile = true
    )
);

-- ===========================================================================
-- 6. TABLES "reports" and "bug_reports" — document missing admin policy
-- ============================================================================
-- FIX NOT APPLIED: The concept of "admin" or "moderator" does not exist in
-- the current schema (no is_admin column on profiles, no admin role table).
-- Adding such a policy requires a product decision first. A follow-up
-- migration should:
--   (a) add `is_admin boolean default false` to profiles, OR
--   (b) create a dedicated `admins` table with a foreign key to profiles.
--   (c) THEN update the SELECT policy on reports and bug_reports to:
--       `reporter_id = auth.uid() OR EXISTS (
--            SELECT 1 FROM profiles p
--            WHERE p.id = auth.uid() AND p.is_admin = true
--        )`
--
-- For now, these tables remain reporter-only. This is a documented product gap.

COMMIT;
