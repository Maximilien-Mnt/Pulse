-- Pulse V6 — Enable realtime for conversation_participants table
-- This enables the conversations list to receive real-time updates when
-- new conversations are created or when users join/leave conversations

-- Add conversation_participants to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_participants;

-- Note: For filtered realtime subscriptions to work efficiently, we need
-- REPLICA IDENTITY set to FULL on the table
ALTER TABLE public.conversation_participants REPLICA IDENTITY FULL;
