-- Migration 028: Fix post likes count with explicit RPC functions
-- This ensures likes_count is properly maintained

-- Create function to increment post likes
CREATE OR REPLACE FUNCTION public.increment_post_likes(post_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.posts 
  SET likes_count = likes_count + 1 
  WHERE id = post_id;
END;
$$;

-- Create function to decrement post likes
CREATE OR REPLACE FUNCTION public.decrement_post_likes(post_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.posts 
  SET likes_count = greatest(likes_count - 1, 0) 
  WHERE id = post_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.increment_post_likes(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_post_likes(uuid) TO authenticated;