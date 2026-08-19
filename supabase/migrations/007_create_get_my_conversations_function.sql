-- Create a function to get conversations that bypasses RLS issues
-- This uses SECURITY DEFINER to run with elevated privileges

CREATE OR REPLACE FUNCTION public.get_my_conversations()
RETURNS TABLE (
  id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  last_message_at timestamptz,
  last_message_preview text,
  is_group boolean,
  group_name text,
  group_photo_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.created_at, c.updated_at, c.last_message_at, 
         c.last_message_preview, c.is_group, c.group_name, c.group_photo_url
  FROM conversations c
  INNER JOIN conversation_participants cp 
    ON cp.conversation_id = c.id
  WHERE cp.user_id = auth.uid()
    AND cp.left_at IS NULL
    AND c.is_group = false;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_my_conversations() TO authenticated;
