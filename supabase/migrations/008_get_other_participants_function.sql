-- Create a function to get other participants in conversations
-- This bypasses RLS issues when querying other participants

CREATE OR REPLACE FUNCTION public.get_conversation_other_participants(p_user_id uuid, p_conv_ids uuid[])
RETURNS TABLE (
  conversation_id uuid,
  other_user_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cp.conversation_id,
    cp_other.user_id as other_user_id
  FROM conversation_participants cp
  INNER JOIN conversation_participants cp_other 
    ON cp_other.conversation_id = cp.conversation_id
    AND cp_other.user_id != p_user_id
  WHERE cp.user_id = p_user_id
    AND cp.left_at IS NULL
    AND cp.conversation_id = ANY(p_conv_ids);
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_conversation_other_participants(uuid, uuid[]) TO authenticated;
