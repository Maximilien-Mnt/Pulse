-- Pulse — Private profile access for users with an existing conversation (migration 037)
-- - Add a function to detect whether two users share an active conversation
-- - Allow SELECT on profiles when the viewer has a conversation with the profile owner

BEGIN;

-- 1. Helper function: does the current authenticated user have an active conversation with p_target_id?
CREATE OR REPLACE FUNCTION public.has_conversation_with(p_target_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM conversation_participants cp_self
    INNER JOIN conversation_participants cp_other
      ON cp_other.conversation_id = cp_self.conversation_id
      AND cp_other.user_id = p_target_id
      AND cp_other.left_at IS NULL
    WHERE cp_self.user_id = auth.uid()
      AND cp_self.left_at IS NULL
  );
$$;

GRANT EXECUTE ON FUNCTION public.has_conversation_with(uuid) TO authenticated;

-- 2. New RLS policy: allow viewing private profiles of users you have a conversation with
DROP POLICY IF EXISTS "profiles_select_conversation" ON public.profiles;

CREATE POLICY "profiles_select_conversation"
ON public.profiles FOR SELECT TO authenticated
USING (
  deleted_at IS NULL
  AND public.has_conversation_with(id)
);

COMMIT;