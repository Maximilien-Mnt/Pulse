-- ---------------------------------------------------------------------------
-- 046 — Message delete policy
--
-- The messages table only had SELECT / INSERT / UPDATE RLS policies.
-- This adds the missing DELETE policy so senders can delete their own
-- messages (used by the message options menu in the conversations screen).
-- ---------------------------------------------------------------------------

CREATE POLICY "messages_delete_own"
ON public.messages FOR DELETE TO authenticated
USING (sender_id = auth.uid());