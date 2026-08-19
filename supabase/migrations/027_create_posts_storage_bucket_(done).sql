-- Create posts storage bucket with RLS policies
-- Fixes grey squares in feed by enabling image uploads/retrieval for posts

-- Create the posts bucket (public so URLs are accessible)
INSERT INTO storage.buckets (id, name, public)
VALUES ('posts', 'posts', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist (idempotent migration)
DROP POLICY IF EXISTS "Posts read" ON storage.objects;
DROP POLICY IF EXISTS "Posts upload own" ON storage.objects;
DROP POLICY IF EXISTS "Posts update own" ON storage.objects;
DROP POLICY IF EXISTS "Posts delete own" ON storage.objects;

-- Policy: Allow public read access to all post images
CREATE POLICY "Posts read"
ON storage.objects FOR SELECT
USING (bucket_id = 'posts');

-- Policy: Allow authenticated users to upload files to their own folder only (e.g. userId/timestamp.jpg)
CREATE POLICY "Posts upload own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'posts'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Allow authenticated users to update their own files
CREATE POLICY "Posts update own"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'posts'
  AND owner = auth.uid()
);

-- Policy: Allow authenticated users to delete their own files
CREATE POLICY "Posts delete own"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'posts'
  AND owner = auth.uid()
);