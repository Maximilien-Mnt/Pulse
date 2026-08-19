-- Pulse V2 — extensions schéma (profil public, groupes, feed, notifications)
-- Ne modifie pas les tables V1 existantes, ajoute colonnes et politiques.

-- ─── profiles ───────────────────────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS public_status jsonb NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS public_photos text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS push_token text;

COMMENT ON COLUMN public.profiles.public_status IS 'Map sport_id → statut public (Coach, Amateur, …)';
COMMENT ON COLUMN public.profiles.public_photos IS 'URLs photos profil public (bucket public-profiles)';

-- ─── conversation_participants ──────────────────────────────────────────────
ALTER TABLE public.conversation_participants
  ADD COLUMN IF NOT EXISTS is_public_list boolean NOT NULL DEFAULT false;

-- ─── conversations (groupes) ────────────────────────────────────────────────
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS is_group boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS group_name text,
  ADD COLUMN IF NOT EXISTS group_photo_url text;

-- ─── messages (édition, épinglage, fichiers) ────────────────────────────────
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS is_edited boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pinned_until timestamptz,
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS file_url text,
  ADD COLUMN IF NOT EXISTS file_name text;

ALTER TABLE public.messages
  DROP CONSTRAINT IF EXISTS messages_type_check;

ALTER TABLE public.messages
  ADD CONSTRAINT messages_type_check CHECK (type IN ('text', 'image', 'file', 'system'));

-- ─── clubs V2 ───────────────────────────────────────────────────────────────
ALTER TABLE public.clubs
  ADD COLUMN IF NOT EXISTS is_private boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS training_schedule jsonb NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS website_url text;

-- ─── events V2 ──────────────────────────────────────────────────────────────
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS is_private boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS website_url text,
  ADD COLUMN IF NOT EXISTS age_min integer,
  ADD COLUMN IF NOT EXISTS age_max integer;

-- ─── user_stats étendu ──────────────────────────────────────────────────────
ALTER TABLE public.user_stats
  ADD COLUMN IF NOT EXISTS total_likes_received integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_comments_received integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS clubs_created_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS events_created_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS historical_follows_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unfollows_count integer NOT NULL DEFAULT 0;

-- ─── Triggers follows → user_stats ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.refresh_follow_counts()
RETURNS TRIGGER AS $$
DECLARE
  fid uuid;
  tid uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    fid := NEW.follower_id;
    tid := NEW.following_id;
    UPDATE public.user_stats SET following_count = following_count + 1, updated_at = now() WHERE user_id = fid;
    UPDATE public.user_stats SET followers_count = followers_count + 1, historical_follows_count = historical_follows_count + 1, updated_at = now() WHERE user_id = tid;
  ELSIF TG_OP = 'DELETE' THEN
    fid := OLD.follower_id;
    tid := OLD.following_id;
    UPDATE public.user_stats SET following_count = greatest(following_count - 1, 0), updated_at = now() WHERE user_id = fid;
    UPDATE public.user_stats SET followers_count = greatest(followers_count - 1, 0), unfollows_count = unfollows_count + 1, updated_at = now() WHERE user_id = tid;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_follows_counts ON public.follows;
CREATE TRIGGER trg_follows_counts
AFTER INSERT OR DELETE ON public.follows
FOR EACH ROW EXECUTE FUNCTION public.refresh_follow_counts();

-- ─── Trigger posts → user_stats.posts_count ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.refresh_user_posts_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.user_stats SET posts_count = posts_count + 1, updated_at = now() WHERE user_id = NEW.author_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.user_stats SET posts_count = greatest(posts_count - 1, 0), updated_at = now() WHERE user_id = OLD.author_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_posts_count ON public.posts;
CREATE TRIGGER trg_posts_count
AFTER INSERT OR DELETE ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.refresh_user_posts_count();

-- ─── Trigger likes/comments → total_likes/comments_received ─────────────────
CREATE OR REPLACE FUNCTION public.refresh_author_likes_received()
RETURNS TRIGGER AS $$
DECLARE aid uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT author_id INTO aid FROM public.posts WHERE id = NEW.post_id;
    IF aid IS NOT NULL THEN
      UPDATE public.user_stats SET total_likes_received = total_likes_received + 1, updated_at = now() WHERE user_id = aid;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    SELECT author_id INTO aid FROM public.posts WHERE id = OLD.post_id;
    IF aid IS NOT NULL THEN
      UPDATE public.user_stats SET total_likes_received = greatest(total_likes_received - 1, 0), updated_at = now() WHERE user_id = aid;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_post_likes_stats ON public.post_likes;
CREATE TRIGGER trg_post_likes_stats
AFTER INSERT OR DELETE ON public.post_likes
FOR EACH ROW EXECUTE FUNCTION public.refresh_author_likes_received();

CREATE OR REPLACE FUNCTION public.refresh_author_comments_received()
RETURNS TRIGGER AS $$
DECLARE aid uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT author_id INTO aid FROM public.posts WHERE id = NEW.post_id;
    IF aid IS NOT NULL THEN
      UPDATE public.user_stats SET total_comments_received = total_comments_received + 1, updated_at = now() WHERE user_id = aid;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    SELECT author_id INTO aid FROM public.posts WHERE id = OLD.post_id;
    IF aid IS NOT NULL THEN
      UPDATE public.user_stats SET total_comments_received = greatest(total_comments_received - 1, 0), updated_at = now() WHERE user_id = aid;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_post_comments_stats ON public.post_comments;
CREATE TRIGGER trg_post_comments_stats
AFTER INSERT OR DELETE ON public.post_comments
FOR EACH ROW EXECUTE FUNCTION public.refresh_author_comments_received();

-- ─── Vue feed_scored_posts (score de base : récence + popularité) ───────────
CREATE OR REPLACE VIEW public.feed_scored_posts AS
SELECT
  p.*,
  (
    -- Récence (0–40) : decay sur 7 jours
    greatest(0, 40.0 * exp(-extract(epoch FROM (now() - p.created_at)) / (7 * 86400)))
    +
    -- Popularité (0–60 normalisée)
    least(60.0, (p.likes_count * 1.0) + (p.comments_count * 2.0) + (p.shares_count * 1.5))
  )::numeric AS base_score
FROM public.posts p;

COMMENT ON VIEW public.feed_scored_posts IS 'Score feed V2 : récence (40%) + popularité (60% base)';

-- Fonction feed personnalisé (sports + follows)
CREATE OR REPLACE FUNCTION public.get_scored_feed(
  p_user_id uuid,
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0,
  p_tag text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  author_id uuid,
  title text,
  body text,
  format text,
  media_urls text[],
  tags text[],
  likes_count integer,
  comments_count integer,
  shares_count integer,
  created_at timestamptz,
  updated_at timestamptz,
  score numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH user_sports AS (
    SELECT sport_id FROM public.user_sports WHERE user_id = p_user_id
  ),
  following AS (
    SELECT following_id FROM public.follows WHERE follower_id = p_user_id
  )
  SELECT
    p.id,
    p.author_id,
    p.title,
    p.body,
    p.format,
    p.media_urls,
    p.tags,
    p.likes_count,
    p.comments_count,
    p.shares_count,
    p.created_at,
    p.updated_at,
    (
      f.base_score
      + CASE WHEN EXISTS (
          SELECT 1 FROM public.user_sports us
          WHERE us.user_id = p.author_id AND us.sport_id IN (SELECT sport_id FROM user_sports)
        ) THEN 20 ELSE 0 END
      + CASE WHEN p.author_id IN (SELECT following_id FROM following) THEN 20 ELSE 0 END
    ) AS score
  FROM public.feed_scored_posts f
  JOIN public.posts p ON p.id = f.id
  WHERE (p_tag IS NULL OR p.tags @> ARRAY[p_tag])
  ORDER BY score DESC, p.created_at DESC
  LIMIT p_limit OFFSET p_offset;
$$;

GRANT EXECUTE ON FUNCTION public.get_scored_feed(uuid, integer, integer, text) TO authenticated;

-- ─── Storage buckets V2 ─────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('public-profiles', 'public-profiles', true),
  ('conversation-files', 'conversation-files', false),
  ('group-photos', 'group-photos', true),
  ('clubs', 'clubs', true),
  ('events', 'events', true)
ON CONFLICT (id) DO NOTHING;

-- public-profiles
CREATE POLICY "Public profiles read"
ON storage.objects FOR SELECT
USING (bucket_id = 'public-profiles');

CREATE POLICY "Public profiles upload own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'public-profiles' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Public profiles update own"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'public-profiles' AND owner = auth.uid());

-- conversation-files (participants only — vérifié côté app)
CREATE POLICY "Conversation files read participant"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'conversation-files');

CREATE POLICY "Conversation files upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'conversation-files' AND (storage.foldername(name))[1] = auth.uid()::text);

-- group-photos
CREATE POLICY "Group photos read"
ON storage.objects FOR SELECT
USING (bucket_id = 'group-photos');

CREATE POLICY "Group photos upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'group-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- clubs bucket policies
CREATE POLICY "Clubs read"
ON storage.objects FOR SELECT
USING (bucket_id = 'clubs');

CREATE POLICY "Clubs upload own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'clubs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Clubs update own"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'clubs' AND owner = auth.uid());

-- events bucket policies
CREATE POLICY "Events read"
ON storage.objects FOR SELECT
USING (bucket_id = 'events');

CREATE POLICY "Events upload own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'events' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Events update own"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'events' AND owner = auth.uid());

-- ─── RLS : profils publics lisibles ─────────────────────────────────────────
CREATE POLICY "profiles_select_public"
ON public.profiles FOR SELECT TO authenticated
USING (is_public_profile = true AND deleted_at IS NULL);

-- message_reactions : lecture pour participants
DROP POLICY IF EXISTS "message_reactions_select" ON public.message_reactions;
CREATE POLICY "message_reactions_select"
ON public.message_reactions FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.messages m
  JOIN public.conversation_participants cp ON cp.conversation_id = m.conversation_id
  WHERE m.id = message_reactions.message_id
    AND cp.user_id = auth.uid()
    AND cp.left_at IS NULL
));

-- Permettre insert participants pour inviter (contact public)
DROP POLICY IF EXISTS "conversation_participants_insert" ON public.conversation_participants;
CREATE POLICY "conversation_participants_insert"
ON public.conversation_participants FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = conversation_participants.conversation_id
      AND cp.user_id = auth.uid()
      AND cp.left_at IS NULL
  )
);
