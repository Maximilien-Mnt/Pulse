-- Pulse V51 — enable realtime for the conversations table
--
-- Problem: renaming a club chat (or any group conversation) updates
-- public.conversations.group_name. The rename was instant for the admin who
-- performed it (optimistic cache write) but every other participant kept
-- seeing the old name until they refreshed the page: public.conversations was
-- never part of the supabase_realtime publication, so no UPDATE was broadcast.
--
-- Fix: publish public.conversations so subscribed clients receive the change.
-- The app listens with a per-conversation filter (`id=eq.<conversation_id>`),
-- so only clients that have that exact conversation open get the event.
--
-- SECURITY CAVEAT (verified against the live database, not assumed):
-- Realtime authorises each broadcast against the table's SELECT RLS. At the
-- time of writing public.conversations carries
--   conversations_select_participant ... FOR SELECT TO public USING (true)
-- i.e. a fully permissive policy. That is DRIFT from migration 001, which
-- created the same policy as an active-participation check
-- (conversation_participants.left_at IS NULL); no migration file in this repo
-- relaxes it, so it was changed directly on the database.
-- Consequence: any authenticated client that knows a conversation id can read
-- that row and receive its UPDATE broadcasts, participant or not.
-- This migration deliberately does NOT tighten that policy: fixing the SELECT
-- grant is a separate, app-wide RLS change (it also affects direct
-- /rest/v1/conversations reads) and must not be smuggled in behind a realtime
-- fix. Track it separately.
--
-- NOTE: deliberately does NOT set REPLICA IDENTITY FULL. The subscription
-- filter targets the primary key column `id`, which the default replica
-- identity already exposes, and public.conversations is updated on *every*
-- message insert via touch_conversation_on_message() (last_message_at,
-- last_message_preview, updated_at), so FULL would bloat the WAL far beyond
-- what a table with this write rate justifies. This differs from migration 006
-- on purpose: conversation_participants filters on a non-PK column.

DO $pulse$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
  END IF;
END $pulse$;
