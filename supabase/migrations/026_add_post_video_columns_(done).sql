-- Add video support columns to posts table
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS video_thumbnail text,
  ADD COLUMN IF NOT EXISTS video_duration integer;

-- Update format constraint to include 'video'
ALTER TABLE public.posts
  DROP CONSTRAINT IF EXISTS posts_format_check;

ALTER TABLE public.posts
  ADD CONSTRAINT posts_format_check
  CHECK (format IN ('text', 'image', 'gallery', 'video'));