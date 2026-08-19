-- SECURITY DEFINER RPC to insert a notification for another user.
-- The notifications table RLS only allows user_id = auth.uid(), so the app
-- cannot insert notifications targeting other users (event invites, club
-- notifications, etc.). This function bypasses RLS (as the table owner) while
-- still requiring the caller to be authenticated.
CREATE OR REPLACE FUNCTION public.notify_user(
  p_user_id uuid,
  p_type text,
  p_title text DEFAULT NULL,
  p_body text DEFAULT NULL,
  p_data jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (p_user_id, p_type, p_title, p_body, p_data);
END;
$$;

GRANT EXECUTE ON FUNCTION public.notify_user(uuid, text, text, text, jsonb) TO authenticated;