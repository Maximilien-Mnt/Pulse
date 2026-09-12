-- ---------------------------------------------------------------------------
-- Audit Test Suite — Privacy & Authorization Verification
-- ---------------------------------------------------------------------------
-- These tests verify that the fixes in migration 047 correctly block
-- unauthorized access. Run them AFTER applying migration 047.
--
-- Each test uses a transaction that is rolled back, so no test data persists.
-- Tests are written as DO blocks that RAISE NOTICE on success and RAISE
-- EXCEPTION on failure.
--
-- Usage: psql -f scripts/audit-tests.sql "postgresql://..."
--        or run via Supabase SQL editor.
-- ---------------------------------------------------------------------------

-- ===========================================================================
-- Helper: assert_equal(expected, actual, message)
-- ===========================================================================
CREATE OR REPLACE FUNCTION _audit_test_assert(
    expected boolean,
    actual boolean,
    message text
) RETURNS void AS $$
BEGIN
    IF expected = actual THEN
        RAISE NOTICE 'PASS: %', message;
    ELSE
        RAISE EXCEPTION 'FAIL: % (expected=%, got=%)', message, expected, actual;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ===========================================================================
-- TEST 1: Storage "conversation-files" — non-owner cannot read
-- ===========================================================================
DO $$
DECLARE
    v_other_user_id uuid;
    v_count integer;
BEGIN
    SELECT id INTO v_other_user_id
    FROM auth.users
    WHERE id != auth.uid()
    LIMIT 1;

    IF v_other_user_id IS NULL THEN
        RAISE NOTICE 'SKIP: conversation-files test (only one user in DB)';
        RETURN;
    END IF;

    SELECT count(*) INTO v_count
    FROM storage.objects
    WHERE bucket_id = 'conversation-files'
      AND (storage.foldername(name))[1] = v_other_user_id::text
      AND (owner != auth.uid() OR owner IS NULL);

    PERFORM _audit_test_assert(
        true,
        (v_count = 0),
        'conversation-files: non-owner cannot see other users'' files'
    );
END;
$$;

-- ===========================================================================
-- TEST 2: Table "posts" — private-profile author's posts hidden from strangers
-- ===========================================================================
DO $$
DECLARE
    v_visible_count integer;
BEGIN
    SELECT count(*) INTO v_visible_count
    FROM posts po
    JOIN profiles pr ON pr.id = po.author_id
    WHERE pr.is_public_profile = false
      AND pr.deleted_at IS NULL
      AND po.author_id != auth.uid();

    PERFORM _audit_test_assert(
        true,
        (v_visible_count = 0),
        'posts: private-profile author posts hidden from non-authors'
    );
END;
$$;

-- ===========================================================================
-- TEST 3: Table "post_comments" — comments on private posts hidden
-- ===========================================================================
DO $$
DECLARE
    v_visible_count integer;
BEGIN
    SELECT count(*) INTO v_visible_count
    FROM post_comments pc
    JOIN posts po ON po.id = pc.post_id
    JOIN profiles pr ON pr.id = po.author_id
    WHERE pr.is_public_profile = false
      AND pr.deleted_at IS NULL
      AND po.author_id != auth.uid()
      AND pc.user_id != auth.uid();

    PERFORM _audit_test_assert(
        true,
        (v_visible_count = 0),
        'post_comments: comments on private-profile posts hidden from non-authors'
    );
END;
$$;


-- ===========================================================================
-- TEST 4: Table "clubs" — private clubs hidden from non-members
-- ===========================================================================
DO $$
DECLARE
    v_private_club_id uuid;
    v_visible_count   integer;
BEGIN
    SELECT c.id INTO v_private_club_id
    FROM clubs c
    WHERE c.is_private = true
      AND c.created_by != auth.uid()
      AND NOT EXISTS (
          SELECT 1 FROM club_members cm
          WHERE cm.club_id = c.id AND cm.user_id = auth.uid()
      )
    LIMIT 1;

    IF v_private_club_id IS NULL THEN
        RAISE NOTICE 'SKIP: clubs test (no private club where viewer is non-member)';
        RETURN;
    END IF;

    SELECT count(*) INTO v_visible_count
    FROM clubs
    WHERE id = v_private_club_id;

    PERFORM _audit_test_assert(
        true,
        (v_visible_count = 0),
        'clubs: private club hidden from non-member non-creator'
    );
END;
$$;

-- ===========================================================================
-- TEST 5: Table "club_members" — membership of private club hidden
-- ===========================================================================
DO $$
DECLARE
    v_private_club_id uuid;
    v_visible_count   integer;
BEGIN
    SELECT c.id INTO v_private_club_id
    FROM clubs c
    WHERE c.is_private = true
      AND c.created_by != auth.uid()
      AND NOT EXISTS (
          SELECT 1 FROM club_members cm
          WHERE cm.club_id = c.id AND cm.user_id = auth.uid()
      )
    LIMIT 1;

    IF v_private_club_id IS NULL THEN
        RAISE NOTICE 'SKIP: club_members test (no private club where viewer is non-member)';
        RETURN;
    END IF;

    SELECT count(*) INTO v_visible_count
    FROM club_members
    WHERE club_id = v_private_club_id;

    PERFORM _audit_test_assert(
        true,
        (v_visible_count = 0),
        'club_members: membership list of private club hidden from non-members'
    );
END;
$$;

-- ===========================================================================
-- TEST 6: Table "events" — private events hidden from non-participants
-- ===========================================================================
DO $$
DECLARE
    v_private_event_id uuid;
    v_visible_count    integer;
BEGIN
    SELECT e.id INTO v_private_event_id
    FROM events e
    WHERE e.is_private = true
      AND e.created_by != auth.uid()
      AND NOT EXISTS (
          SELECT 1 FROM event_participants ep
          WHERE ep.event_id = e.id AND ep.user_id = auth.uid()
      )
    LIMIT 1;

    IF v_private_event_id IS NULL THEN
        RAISE NOTICE 'SKIP: events test (no private event where viewer is non-participant)';
        RETURN;
    END IF;

    SELECT count(*) INTO v_visible_count
    FROM events
    WHERE id = v_private_event_id;

    PERFORM _audit_test_assert(
        true,
        (v_visible_count = 0),
        'events: private event hidden from non-participant non-creator'
    );
END;
$$;

-- ===========================================================================
-- TEST 7: Table "event_participants" — participants of private event hidden
-- ===========================================================================
DO $$
DECLARE
    v_private_event_id uuid;
    v_visible_count    integer;
BEGIN
    SELECT e.id INTO v_private_event_id
    FROM events e
    WHERE e.is_private = true
      AND e.created_by != auth.uid()
      AND NOT EXISTS (
          SELECT 1 FROM event_participants ep
          WHERE ep.event_id = e.id AND ep.user_id = auth.uid()
      )
    LIMIT 1;

    IF v_private_event_id IS NULL THEN
        RAISE NOTICE 'SKIP: event_participants test (no private event where viewer is non-participant)';
        RETURN;
    END IF;

    SELECT count(*) INTO v_visible_count
    FROM event_participants
    WHERE event_id = v_private_event_id;

    PERFORM _audit_test_assert(
        true,
        (v_visible_count = 0),
        'event_participants: participant list of private event hidden from non-participants'
    );
END;
$$;


-- ===========================================================================
-- TEST 8: Table "follows" — social graph partially hidden
-- ===========================================================================
DO $$
DECLARE
    v_hidden_count integer;
BEGIN
    SELECT count(*) INTO v_hidden_count
    FROM follows f
    JOIN profiles pf ON pf.id = f.follower_id
    JOIN profiles pfg ON pfg.id = f.following_id
    WHERE pf.is_public_profile = false
      AND pfg.is_public_profile = false
      AND f.follower_id != auth.uid()
      AND f.following_id != auth.uid();

    PERFORM _audit_test_assert(
        true,
        (v_hidden_count = 0),
        'follows: relationships between two private profiles hidden from third parties'
    );
END;
$$;

-- ===========================================================================
-- TEST 9: Verify new policies exist (sanity check)
-- ===========================================================================
DO $$
DECLARE
    v_count integer;
BEGIN
    SELECT count(*) INTO v_count
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND policyname = 'Conversation files read owner';

    PERFORM _audit_test_assert(true, (v_count = 1),
        'storage: "Conversation files read owner" policy exists');

    SELECT count(*) INTO v_count
    FROM pg_policies
    WHERE tablename = 'posts'
      AND policyname = 'posts_select'
      AND cmd = 'SELECT'
      AND qual != 'true';

    PERFORM _audit_test_assert(true, (v_count = 1),
        'posts: posts_select policy is no longer USING(true)');

    SELECT count(*) INTO v_count
    FROM pg_policies
    WHERE tablename = 'clubs'
      AND policyname = 'clubs_select'
      AND cmd = 'SELECT'
      AND qual != 'true';

    PERFORM _audit_test_assert(true, (v_count = 1),
        'clubs: clubs_select policy is no longer USING(true)');

    SELECT count(*) INTO v_count
    FROM pg_policies
    WHERE tablename = 'events'
      AND policyname = 'events_select'
      AND cmd = 'SELECT'
      AND qual != 'true';

    PERFORM _audit_test_assert(true, (v_count = 1),
        'events: events_select policy is no longer USING(true)');

    SELECT count(*) INTO v_count
    FROM pg_policies
    WHERE tablename = 'follows'
      AND policyname = 'follows_select'
      AND cmd = 'SELECT'
      AND qual != 'true';

    PERFORM _audit_test_assert(true, (v_count = 1),
        'follows: follows_select policy is no longer USING(true)');
END;
$$;

-- ===========================================================================
-- TEST 10: Verify old permissive policies are removed
-- ===========================================================================
DO $$
DECLARE
    v_count integer;
BEGIN
    SELECT count(*) INTO v_count
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND policyname = 'Conversation files read participant';

    PERFORM _audit_test_assert(true, (v_count = 0),
        'storage: old "Conversation files read participant" policy removed');
END;
$$;

-- ===========================================================================
-- Cleanup helper function
-- ===========================================================================
DROP FUNCTION IF EXISTS _audit_test_assert(boolean, boolean, text);

RAISE NOTICE '========================================';
RAISE NOTICE 'Audit test suite complete.';
RAISE NOTICE '========================================';
