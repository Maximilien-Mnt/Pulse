-- Pulse V3 — sync externe, invitation tokens, posts videos, search
--uteur: Maximilien

-- ─── Tables pour les données externes synchronisées ────────────────────────────

-- Table des clubs externes (OpenStreetMap, HelloAsso, etc.)
CREATE TABLE IF NOT EXISTS external_clubs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sport text,
  address text,
  city text,
  country text,
  latitude double precision,
  longitude double precision,
  website text,
  phone text,
  email text,
  source_url text UNIQUE,
  source_name text NOT NULL DEFAULT 'OpenStreetMap',
  is_external boolean NOT NULL DEFAULT true,
  external_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Table des événements externes
CREATE TABLE IF NOT EXISTS external_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  sport text,
  address text,
  city text,
  country text,
  latitude double precision,
  longitude double precision,
  start_date timestamptz,
  end_date timestamptz,
  website_url text,
  organizer_name text,
  source_url text UNIQUE,
  source_name text NOT NULL DEFAULT 'OpenStreetMap',
  is_external boolean NOT NULL DEFAULT true,
  external_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Table des tokens d'invitation pour clubs/events privés
CREATE TABLE IF NOT EXISTS invitation_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text UNIQUE NOT NULL,
  type text NOT NULL CHECK (type IN ('club', 'event')),
  target_id uuid NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  max_uses integer NOT NULL DEFAULT 1,
  uses_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Table des paramètres utilisateur (opt-in analytics, etc.)
CREATE TABLE IF NOT EXISTS user_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  posthog_opt_out boolean NOT NULL DEFAULT false,
  notifications_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ─── Colonne format extended pour posts (vidéo) ────────────────────────────────

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS video_thumbnail text,
  ADD COLUMN IF NOT EXISTS video_duration integer;

ALTER TABLE public.posts
  DROP CONSTRAINT IF EXISTS posts_format_check;

ALTER TABLE public.posts
  ADD CONSTRAINT posts_format_check CHECK (format IN ('text', 'image', 'gallery', 'video'));

-- ─── Index pour la recherche et géolocalisation ────────────────────────────────

-- Index full-text pour la recherche dans les posts
CREATE INDEX IF NOT EXISTS idx_posts_search ON public.posts 
  USING GIN (to_tsvector('french', COALESCE(title, '') || ' ' || COALESCE(body, '')));

-- Index géospatial pour les clubs
CREATE INDEX IF NOT EXISTS idx_external_clubs_geo ON external_clubs (latitude, longitude);

-- Index géospatial pour les événements
CREATE INDEX IF NOT EXISTS idx_external_events_geo ON external_events (latitude, longitude);

-- Index sur les tokens d'invitation
CREATE INDEX IF NOT EXISTS idx_invitation_tokens_token ON invitation_tokens (token);
CREATE INDEX IF NOT EXISTS idx_invitation_tokens_target ON invitation_tokens (target_id, type);

-- ─── Fonction de calcul de distance (Haversine) ────────────────────────────────

CREATE OR REPLACE FUNCTION public.calculate_distance(
  lat1 double precision,
  lon1 double precision,
  lat2 double precision,
  lon2 double precision
)
RETURNS double precision
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT (
    6371 * acos(
      cos(radians(lat1)) * cos(radians(lat2)) *
      cos(radians(lon2) - radians(lon1)) +
      sin(radians(lat1)) * sin(radians(lat2))
    )
  )::double precision;
$$;

COMMENT ON FUNCTION public.calculate_distance IS 'Calcule la distance en km entre deux points GPS (formule Haversine)';

-- ─── Fonction de recherche full-text ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.search_posts(
  p_query text,
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0,
  p_format text DEFAULT NULL,
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
  video_url text,
  video_thumbnail text,
  video_duration integer,
  search_rank float
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
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
    p.video_url,
    p.video_thumbnail,
    p.video_duration,
    ts_rank(to_tsvector('french', COALESCE(p.title, '') || ' ' || COALESCE(p.body, '')), plainto_tsquery('french', p_query)) AS search_rank
  FROM public.posts p
  WHERE to_tsvector('french', COALESCE(p.title, '') || ' ' || COALESCE(p.body, '')) @@ plainto_tsquery('french', p_query)
    AND (p_format IS NULL OR p.format = p_format)
    AND (p_tag IS NULL OR p.tags @> ARRAY[p_tag])
  ORDER BY search_rank DESC, p.created_at DESC
  LIMIT p_limit OFFSET p_offset;
$$;

GRANT EXECUTE ON FUNCTION public.search_posts(text, integer, integer, text, text) TO authenticated;

-- ─── Fonction pour clubs proches ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_nearby_clubs(
  p_lat double precision,
  p_lon double precision,
  p_radius_km double precision DEFAULT 10,
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  name text,
  sport text,
  address text,
  city text,
  country text,
  latitude double precision,
  longitude double precision,
  website_url text,
  is_private boolean,
  created_by uuid,
  created_at timestamptz,
  distance_km double precision
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    c.id,
    c.name,
    c.sport,
    c.address,
    c.city,
    c.country,
    c.latitude,
    c.longitude,
    c.website_url,
    c.is_private,
    c.created_by,
    c.created_at,
    public.calculate_distance(p_lat, p_lon, c.latitude, c.longitude) AS distance_km
  FROM public.clubs c
  WHERE c.latitude IS NOT NULL AND c.longitude IS NOT NULL
    AND public.calculate_distance(p_lat, p_lon, c.latitude, c.longitude) <= p_radius_km
  ORDER BY distance_km ASC
  LIMIT p_limit OFFSET p_offset;
$$;

GRANT EXECUTE ON FUNCTION public.get_nearby_clubs(double precision, double precision, double precision, integer, integer) TO authenticated;

-- ─── Fonction pour événements proches ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_nearby_events(
  p_lat double precision,
  p_lon double precision,
  p_radius_km double precision DEFAULT 10,
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0,
  p_future_only boolean DEFAULT true
)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  sport text,
  address text,
  city text,
  country text,
  latitude double precision,
  longitude double precision,
  start_date timestamptz,
  end_date timestamptz,
  website_url text,
  is_private boolean,
  created_by uuid,
  created_at timestamptz,
  distance_km double precision
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    e.id,
    e.title,
    e.description,
    e.sport,
    e.address,
    e.city,
    e.country,
    e.latitude,
    e.longitude,
    e.start_date,
    e.end_date,
    e.website_url,
    e.is_private,
    e.created_by,
    e.created_at,
    public.calculate_distance(p_lat, p_lon, e.latitude, e.longitude) AS distance_km
  FROM public.events e
  WHERE e.latitude IS NOT NULL AND e.longitude IS NOT NULL
    AND (p_future_only = false OR e.start_date > now())
    AND public.calculate_distance(p_lat, p_lon, e.latitude, e.longitude) <= p_radius_km
  ORDER BY distance_km ASC, e.start_date ASC
  LIMIT p_limit OFFSET p_offset;
$$;

GRANT EXECUTE ON FUNCTION public.get_nearby_events(double precision, double precision, double precision, integer, integer, boolean) TO authenticated;

-- ─── Storage bucket pour vidéos ───────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES ('posts-videos', 'posts-videos', true)
ON CONFLICT (id) DO NOTHING;

-- Politique pour les vidéos
CREATE POLICY "Posts videos read"
ON storage.objects FOR SELECT
USING (bucket_id = 'posts-videos');

CREATE POLICY "Posts videos upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'posts-videos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ─── Trigger pour mettre à jour updated_at ───────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_external_clubs_updated
  BEFORE UPDATE ON external_clubs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_external_events_updated
  BEFORE UPDATE ON external_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_user_settings_updated
  BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ─── Politique RLS pour les tables V3 ─────────────────────────────────────────

-- external_clubs : lecture publique
CREATE POLICY "external_clubs_read" ON external_clubs FOR SELECT USING (true);

-- external_events : lecture publique
CREATE POLICY "external_events_read" ON external_events FOR SELECT USING (true);

-- invitation_tokens : lecture pour le créateur ou utilisation valide
CREATE POLICY "invitation_tokens_read" ON invitation_tokens FOR SELECT
USING (created_by = auth.uid() OR uses_count < max_uses AND expires_at > now());

-- invitation_tokens : insertion pour utilisateurs connectés
CREATE POLICY "invitation_tokens_insert" ON invitation_tokens FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid());

-- user_settings : lecture/écriture pour le propriétaire
CREATE POLICY "user_settings_read" ON user_settings FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "user_settings_insert" ON user_settings FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_settings_update" ON user_settings FOR UPDATE USING (user_id = auth.uid());

-- ─── Historique de recherche (table) ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS search_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  query text NOT NULL,
  type text CHECK (type IN ('profiles', 'posts_title', 'posts_desc', 'tags')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_search_history_user ON search_history (user_id, created_at DESC);

CREATE POLICY "search_history_read" ON search_history FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "search_history_insert" ON search_history FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
