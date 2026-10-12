-- Migration 052 — Storage upload hardening (server-side allow-list).
-- Authority: Postgres/RLS. Client checks (lib/uploadSecurity.ts) fail fast;
-- this migration rejects bypass attempts (direct Storage API uploads).
-- Buckets: images only, except posts/posts-videos (+video mp4/mov).
BEGIN;

UPDATE storage.buckets SET file_size_limit = 4 * 1024 * 1024 WHERE id = 'avatars';
UPDATE storage.buckets SET file_size_limit = 8 * 1024 * 1024 WHERE id IN ('posts', 'clubs', 'events', 'group-photos', 'public-profiles');
UPDATE storage.buckets SET file_size_limit = 100 * 1024 * 1024 WHERE id = 'posts-videos';
UPDATE storage.buckets SET file_size_limit = 5 * 1024 * 1024 WHERE id = 'conversation-files';

UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
WHERE id IN ('avatars', 'clubs', 'events', 'group-photos', 'public-profiles', 'conversation-files');


CREATE OR REPLACE FUNCTION public.storage_upload_path_ok(object_name text, allow_video boolean)
RETURNS boolean
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  fname text;
  parts text[];
  seg text;
BEGIN
  IF object_name IS NULL OR object_name = '' OR length(object_name) > 512 THEN
    RETURN false;
  END IF;
  IF object_name LIKE '%' || chr(0) || '%' OR object_name ~* '%00' THEN RETURN false; END IF;
  IF object_name LIKE '%\%' THEN RETURN false; END IF;
  IF object_name LIKE '%/../%' OR object_name LIKE '../%' OR object_name LIKE '%/..'
     OR object_name LIKE '%//%' OR object_name LIKE '/%' THEN RETURN false; END IF;
  parts := regexp_split_to_array(object_name, '/');
  fname := parts[array_length(parts, 1)];
  IF fname IS NULL OR fname = '' OR fname LIKE '.%' THEN RETURN false; END IF;
  fname := lower(fname);
  FOREACH seg IN ARRAY string_to_array(fname, '.') LOOP
    IF seg IN ('php','php3','php4','php5','phtml','phar','jsp','jspx','asp','aspx',
               'cgi','pl','py','rb','sh','exe','msi','bat','cmd','com','scr','ps1',
               'html','htm','svg','xml','js','mjs','wasm',
               'zip','rar','7z','tar','gz','jar','war','pdf') THEN
      RETURN false;
    END IF;
  END LOOP;
  IF fname LIKE '%.jpg' OR fname LIKE '%.jpeg' OR fname LIKE '%.png'
     OR fname LIKE '%.webp' OR fname LIKE '%.heic' OR fname LIKE '%.heif' THEN
    RETURN true;
  END IF;
  IF allow_video AND (fname LIKE '%.mp4' OR fname LIKE '%.mov') THEN
    RETURN true;
  END IF;
  RETURN false;
END;
$$;


DROP POLICY IF EXISTS "Avatars authenticated upload" ON storage.objects;
CREATE POLICY "Avatars authenticated upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND public.storage_upload_path_ok(name, false));

DROP POLICY IF EXISTS "Posts authenticated upload" ON storage.objects;
DROP POLICY IF EXISTS "Posts upload own" ON storage.objects;
CREATE POLICY "Posts upload own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'posts'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND public.storage_upload_path_ok(name, true));

DROP POLICY IF EXISTS "Posts videos upload" ON storage.objects;
CREATE POLICY "Posts videos upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'posts-videos'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND public.storage_upload_path_ok(name, true));

DROP POLICY IF EXISTS "Clubs upload own" ON storage.objects;
CREATE POLICY "Clubs upload own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'clubs'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND public.storage_upload_path_ok(name, false));

DROP POLICY IF EXISTS "Events upload own" ON storage.objects;
CREATE POLICY "Events upload own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'events'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND public.storage_upload_path_ok(name, false));

DROP POLICY IF EXISTS "Group photos upload" ON storage.objects;
CREATE POLICY "Group photos upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'group-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND public.storage_upload_path_ok(name, false));

DROP POLICY IF EXISTS "Public profiles upload own" ON storage.objects;
CREATE POLICY "Public profiles upload own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'public-profiles'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND public.storage_upload_path_ok(name, false));

DROP POLICY IF EXISTS "Conversation files upload" ON storage.objects;
CREATE POLICY "Conversation files upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'conversation-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND public.storage_upload_path_ok(name, false));

COMMIT;

UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'video/mp4', 'video/quicktime']
WHERE id IN ('posts', 'posts-videos');
