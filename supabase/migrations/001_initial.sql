-- Pulse V1 — schéma initial (PostgreSQL / Supabase)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL,
  username text NOT NULL,
  avatar_url text,
  bio text,
  birth_date date,
  country text,
  city text,
  language text NOT NULL DEFAULT 'fr',
  height_cm integer,
  weight_kg numeric(5,2),
  discovery_source text,
  interested_sports text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  is_public_profile boolean NOT NULL DEFAULT false,
  CONSTRAINT profiles_username_len CHECK (char_length(username) BETWEEN 3 AND 30)
);

CREATE UNIQUE INDEX idx_profiles_username_lower ON public.profiles (lower(username));

CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.check_username_available(p_username text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_username IS NULL OR length(trim(p_username)) < 3 THEN
    RETURN false;
  END IF;
  RETURN NOT EXISTS (
    SELECT 1 FROM public.profiles pr
    WHERE lower(pr.username) = lower(trim(p_username))
      AND pr.deleted_at IS NULL
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_username_available(text) TO anon, authenticated;

-- user_sports
CREATE TABLE public.user_sports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  sport_id text NOT NULL,
  level text NOT NULL,
  practice text NOT NULL,
  weekdays smallint[] NOT NULL DEFAULT '{}',
  times_per_week integer NOT NULL DEFAULT 1 CHECK (times_per_week >= 1 AND times_per_week <= 14),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_sports_user ON public.user_sports (user_id);

-- user_objectives
CREATE TABLE public.user_objectives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  objective text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_objectives_user ON public.user_objectives (user_id);

-- follows
CREATE TABLE public.follows (
  follower_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, following_id),
  CONSTRAINT follows_no_self CHECK (follower_id <> following_id)
);

-- clubs
CREATE TABLE public.clubs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sport text NOT NULL,
  description text NOT NULL DEFAULT '',
  short_description text NOT NULL DEFAULT '',
  country text NOT NULL,
  city text NOT NULL,
  address text,
  latitude double precision,
  longitude double precision,
  logo_url text,
  hero_urls text[] NOT NULL DEFAULT '{}',
  registration_url text,
  is_external boolean NOT NULL DEFAULT false,
  source_url text,
  source_name text,
  member_count integer NOT NULL DEFAULT 0 CHECK (member_count >= 0),
  founded_date date,
  league text,
  age_min integer,
  age_max integer,
  required_level text,
  contact_email text,
  created_by uuid REFERENCES public.profiles (id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_clubs_sport ON public.clubs (sport);
CREATE INDEX idx_clubs_city ON public.clubs (city);
CREATE INDEX idx_clubs_country ON public.clubs (country);

CREATE TRIGGER trg_clubs_updated_at
BEFORE UPDATE ON public.clubs
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- club_members
CREATE TABLE public.club_members (
  club_id uuid NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (club_id, user_id)
);

CREATE OR REPLACE FUNCTION public.refresh_club_member_count()
RETURNS TRIGGER AS $$
DECLARE
  cid uuid;
BEGIN
  cid := COALESCE(NEW.club_id, OLD.club_id);
  UPDATE public.clubs c
  SET member_count = (SELECT count(*)::int FROM public.club_members m WHERE m.club_id = cid)
  WHERE c.id = cid;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_club_members_ai
AFTER INSERT ON public.club_members
FOR EACH ROW EXECUTE FUNCTION public.refresh_club_member_count();

CREATE TRIGGER trg_club_members_ad
AFTER DELETE ON public.club_members
FOR EACH ROW EXECUTE FUNCTION public.refresh_club_member_count();

-- club_favorites
CREATE TABLE public.club_favorites (
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  club_id uuid NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, club_id)
);

-- club_join_requests
CREATE TABLE public.club_join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (club_id, user_id)
);

-- events
CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sport text NOT NULL,
  description text NOT NULL DEFAULT '',
  short_description text NOT NULL DEFAULT '',
  country text NOT NULL,
  city text NOT NULL,
  venue_address text,
  latitude double precision,
  longitude double precision,
  start_date timestamptz NOT NULL,
  end_date timestamptz,
  price_cents integer NOT NULL DEFAULT 0,
  is_paid boolean NOT NULL DEFAULT false,
  difficulty smallint NOT NULL DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 5),
  category text,
  logo_url text,
  hero_urls text[] NOT NULL DEFAULT '{}',
  registration_url text,
  is_external boolean NOT NULL DEFAULT false,
  source_url text,
  source_name text,
  places_total integer,
  places_left integer,
  required_level text,
  club_id uuid REFERENCES public.clubs (id),
  created_by uuid REFERENCES public.profiles (id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_events_sport ON public.events (sport);
CREATE INDEX idx_events_city ON public.events (city);
CREATE INDEX idx_events_start_date ON public.events (start_date);

CREATE TRIGGER trg_events_updated_at
BEFORE UPDATE ON public.events
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- event_participants
CREATE TABLE public.event_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'registered',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);

-- event_favorites
CREATE TABLE public.event_favorites (
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, event_id)
);

-- event_join_requests
CREATE TABLE public.event_join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);

-- posts
CREATE TABLE public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  format text NOT NULL DEFAULT 'text' CHECK (format IN ('text', 'image', 'gallery')),
  media_urls text[] NOT NULL DEFAULT '{}',
  tags text[] NOT NULL DEFAULT '{}',
  likes_count integer NOT NULL DEFAULT 0,
  comments_count integer NOT NULL DEFAULT 0,
  shares_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_posts_author ON public.posts (author_id);
CREATE INDEX idx_posts_created_at ON public.posts (created_at DESC);

CREATE TRIGGER trg_posts_updated_at
BEFORE UPDATE ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- post_likes
CREATE TABLE public.post_likes (
  post_id uuid NOT NULL REFERENCES public.posts (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

CREATE OR REPLACE FUNCTION public.adjust_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET likes_count = greatest(likes_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_post_likes_ai
AFTER INSERT ON public.post_likes
FOR EACH ROW EXECUTE FUNCTION public.adjust_post_likes_count();

CREATE TRIGGER trg_post_likes_ad
AFTER DELETE ON public.post_likes
FOR EACH ROW EXECUTE FUNCTION public.adjust_post_likes_count();

-- post_comments
CREATE TABLE public.post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  body text NOT NULL,
  likes_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_post_comments_post ON public.post_comments (post_id);

CREATE OR REPLACE FUNCTION public.adjust_post_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET comments_count = greatest(comments_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_post_comments_ai
AFTER INSERT ON public.post_comments
FOR EACH ROW EXECUTE FUNCTION public.adjust_post_comments_count();

CREATE TRIGGER trg_post_comments_ad
AFTER DELETE ON public.post_comments
FOR EACH ROW EXECUTE FUNCTION public.adjust_post_comments_count();

-- comment_likes
CREATE TABLE public.comment_likes (
  comment_id uuid NOT NULL REFERENCES public.post_comments (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (comment_id, user_id)
);

CREATE OR REPLACE FUNCTION public.adjust_comment_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.post_comments SET likes_count = likes_count + 1 WHERE id = NEW.comment_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.post_comments SET likes_count = greatest(likes_count - 1, 0) WHERE id = OLD.comment_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_comment_likes_ai
AFTER INSERT ON public.comment_likes
FOR EACH ROW EXECUTE FUNCTION public.adjust_comment_likes_count();

CREATE TRIGGER trg_comment_likes_ad
AFTER DELETE ON public.comment_likes
FOR EACH ROW EXECUTE FUNCTION public.adjust_comment_likes_count();

-- conversations
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz,
  last_message_preview text
);

CREATE TRIGGER trg_conversations_updated_at
BEFORE UPDATE ON public.conversations
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- conversation_participants
CREATE TABLE public.conversation_participants (
  conversation_id uuid NOT NULL REFERENCES public.conversations (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  pinned boolean NOT NULL DEFAULT false,
  left_at timestamptz,
  unread_count integer NOT NULL DEFAULT 0,
  last_read_at timestamptz,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

-- messages
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations (id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  body text,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  is_deleted boolean NOT NULL DEFAULT false
);

CREATE INDEX idx_messages_conversation ON public.messages (conversation_id);
CREATE INDEX idx_messages_created_at ON public.messages (conversation_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.touch_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations c
  SET last_message_at = NEW.created_at,
      last_message_preview = left(coalesce(NEW.body, ''), 140),
      updated_at = now()
  WHERE c.id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_messages_touch_conversation
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.touch_conversation_on_message();

-- message_reactions
CREATE TABLE public.message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messages (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  emoji text NOT NULL DEFAULT '👍',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id, emoji)
);

-- message_hidden
CREATE TABLE public.message_hidden (
  message_id uuid NOT NULL REFERENCES public.messages (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id)
);

-- reports
CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  target_type text NOT NULL,
  target_id uuid NOT NULL,
  message text,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- notifications
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  type text NOT NULL,
  title text,
  body text,
  data jsonb NOT NULL DEFAULT '{}',
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON public.notifications (user_id);

-- user_stats
CREATE TABLE public.user_stats (
  user_id uuid PRIMARY KEY REFERENCES public.profiles (id) ON DELETE CASCADE,
  followers_count integer NOT NULL DEFAULT 0,
  following_count integer NOT NULL DEFAULT 0,
  posts_count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- feed_interactions
CREATE TABLE public.feed_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES public.posts (id) ON DELETE CASCADE,
  action text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_feed_interactions_user ON public.feed_interactions (user_id);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true), ('posts', 'posts', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Avatars public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Avatars authenticated upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Avatars owner update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND owner = auth.uid());

CREATE POLICY "Posts public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'posts');

CREATE POLICY "Posts authenticated upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'posts' AND (storage.foldername(name))[1] = auth.uid()::text);

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_hidden ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_interactions ENABLE ROW LEVEL SECURITY;

-- profiles policies
CREATE POLICY "profiles_select_authenticated"
ON public.profiles FOR SELECT TO authenticated
USING (deleted_at IS NULL);

CREATE POLICY "profiles_insert_own"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_own"
ON public.profiles FOR UPDATE TO authenticated
USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- user_sports
CREATE POLICY "user_sports_select"
ON public.user_sports FOR SELECT TO authenticated
USING (true);

CREATE POLICY "user_sports_mutate_own"
ON public.user_sports FOR ALL TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- user_objectives
CREATE POLICY "user_objectives_select"
ON public.user_objectives FOR SELECT TO authenticated
USING (true);

CREATE POLICY "user_objectives_mutate_own"
ON public.user_objectives FOR ALL TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- follows
CREATE POLICY "follows_select"
ON public.follows FOR SELECT TO authenticated
USING (true);

CREATE POLICY "follows_mutate_own"
ON public.follows FOR ALL TO authenticated
USING (follower_id = auth.uid()) WITH CHECK (follower_id = auth.uid());

-- clubs public read
CREATE POLICY "clubs_select"
ON public.clubs FOR SELECT TO authenticated
USING (true);

CREATE POLICY "clubs_write_creator"
ON public.clubs FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid() OR created_by IS NULL);

CREATE POLICY "clubs_update_creator"
ON public.clubs FOR UPDATE TO authenticated
USING (created_by = auth.uid());

-- club_members
CREATE POLICY "club_members_select"
ON public.club_members FOR SELECT TO authenticated
USING (true);

CREATE POLICY "club_members_insert_self"
ON public.club_members FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "club_members_delete_self"
ON public.club_members FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- club_favorites
CREATE POLICY "club_favorites_all_own"
ON public.club_favorites FOR ALL TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- club_join_requests
CREATE POLICY "club_join_requests_select"
ON public.club_join_requests FOR SELECT TO authenticated
USING (user_id = auth.uid() OR EXISTS (
  SELECT 1 FROM public.clubs c
  WHERE c.id = club_join_requests.club_id AND c.created_by = auth.uid()
));

CREATE POLICY "club_join_requests_insert"
ON public.club_join_requests FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "club_join_requests_update"
ON public.club_join_requests FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR EXISTS (
  SELECT 1 FROM public.clubs c WHERE c.id = club_id AND c.created_by = auth.uid()
));

-- events
CREATE POLICY "events_select"
ON public.events FOR SELECT TO authenticated
USING (true);

CREATE POLICY "events_insert"
ON public.events FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid() OR created_by IS NULL);

CREATE POLICY "events_update_own"
ON public.events FOR UPDATE TO authenticated
USING (created_by = auth.uid());

-- event_participants
CREATE POLICY "event_participants_select"
ON public.event_participants FOR SELECT TO authenticated
USING (true);

CREATE POLICY "event_participants_mutate_own"
ON public.event_participants FOR ALL TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- event_favorites
CREATE POLICY "event_favorites_own"
ON public.event_favorites FOR ALL TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- event_join_requests
CREATE POLICY "event_join_requests_select"
ON public.event_join_requests FOR SELECT TO authenticated
USING (user_id = auth.uid() OR EXISTS (
  SELECT 1 FROM public.events e WHERE e.id = event_id AND e.created_by = auth.uid()
));

CREATE POLICY "event_join_requests_insert"
ON public.event_join_requests FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "event_join_requests_update"
ON public.event_join_requests FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR EXISTS (
  SELECT 1 FROM public.events e WHERE e.id = event_id AND e.created_by = auth.uid()
));

-- posts
CREATE POLICY "posts_select"
ON public.posts FOR SELECT TO authenticated
USING (true);

CREATE POLICY "posts_insert_own"
ON public.posts FOR INSERT TO authenticated
WITH CHECK (author_id = auth.uid());

CREATE POLICY "posts_update_own"
ON public.posts FOR UPDATE TO authenticated
USING (author_id = auth.uid());

CREATE POLICY "posts_delete_own"
ON public.posts FOR DELETE TO authenticated
USING (author_id = auth.uid());

-- post_likes
CREATE POLICY "post_likes_select"
ON public.post_likes FOR SELECT TO authenticated
USING (true);

CREATE POLICY "post_likes_mutate_own"
ON public.post_likes FOR ALL TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- post_comments
CREATE POLICY "post_comments_select"
ON public.post_comments FOR SELECT TO authenticated
USING (true);

CREATE POLICY "post_comments_insert"
ON public.post_comments FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "post_comments_update_own"
ON public.post_comments FOR UPDATE TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "post_comments_delete_own"
ON public.post_comments FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- comment_likes
CREATE POLICY "comment_likes_all_own"
ON public.comment_likes FOR ALL TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- conversations: visible si participant actif
CREATE POLICY "conversations_select_participant"
ON public.conversations FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.conversation_participants cp
  WHERE cp.conversation_id = id AND cp.user_id = auth.uid() AND cp.left_at IS NULL
));

CREATE POLICY "conversations_insert"
ON public.conversations FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "conversations_update_participant"
ON public.conversations FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.conversation_participants cp
  WHERE cp.conversation_id = id AND cp.user_id = auth.uid() AND cp.left_at IS NULL
));

-- conversation_participants
CREATE POLICY "conversation_participants_select"
ON public.conversation_participants FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.conversation_participants cp2
    WHERE cp2.conversation_id = conversation_participants.conversation_id
      AND cp2.user_id = auth.uid()
      AND cp2.left_at IS NULL
  )
);

CREATE POLICY "conversation_participants_insert"
ON public.conversation_participants FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "conversation_participants_update_own"
ON public.conversation_participants FOR UPDATE TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- messages
CREATE POLICY "messages_select"
ON public.messages FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.conversation_participants cp
  WHERE cp.conversation_id = messages.conversation_id
    AND cp.user_id = auth.uid()
    AND cp.left_at IS NULL
) AND NOT EXISTS (
  SELECT 1 FROM public.message_hidden mh
  WHERE mh.message_id = messages.id AND mh.user_id = auth.uid()
));

CREATE POLICY "messages_insert"
ON public.messages FOR INSERT TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = conversation_id AND cp.user_id = auth.uid() AND cp.left_at IS NULL
  )
);

CREATE POLICY "messages_update_own"
ON public.messages FOR UPDATE TO authenticated
USING (sender_id = auth.uid());

-- message_reactions
CREATE POLICY "message_reactions_own"
ON public.message_reactions FOR ALL TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- message_hidden
CREATE POLICY "message_hidden_own"
ON public.message_hidden FOR ALL TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- reports
CREATE POLICY "reports_insert_own"
ON public.reports FOR INSERT TO authenticated
WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "reports_select_own"
ON public.reports FOR SELECT TO authenticated
USING (reporter_id = auth.uid());

-- notifications
CREATE POLICY "notifications_own"
ON public.notifications FOR ALL TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- user_stats
CREATE POLICY "user_stats_select"
ON public.user_stats FOR SELECT TO authenticated
USING (true);

CREATE POLICY "user_stats_own_write"
ON public.user_stats FOR ALL TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- feed_interactions
CREATE POLICY "feed_interactions_own"
ON public.feed_interactions FOR ALL TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Trigger: créer user_stats à l'inscription profil
CREATE OR REPLACE FUNCTION public.create_user_stats_for_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_stats (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_user_stats
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.create_user_stats_for_profile();

-- Handle new auth user: optional — app creates profile client-side after signup
-- Fonction handle_updated_at messages (pas de colonne updated_at sur messages — skip)

COMMENT ON TABLE public.profiles IS 'Profils utilisateurs Pulse';
