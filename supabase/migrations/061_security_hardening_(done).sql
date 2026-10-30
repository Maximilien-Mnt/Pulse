-- ---------------------------------------------------------------------------
-- Migration 061 — Security hardening (audit remediation)
-- ---------------------------------------------------------------------------
-- Appliquer d'abord en staging, puis en prod. Idempotent (DROP IF EXISTS /
-- CREATE OR REPLACE / ADD COLUMN IF NOT EXISTS) pour pouvoir être rejouée.
--
-- Couverture des constats d'audit :
--   A  notify_user (016) : durcissement, rate limiting, règles de relation
--   B  profiles : table profile_private, colonnes sensibles retirées de profiles
--   C  profiles_select_public supprimée, policy unique avec blocage bidirectionnel
--   D  get_scored_feed / get_conversation_other_participants supprimées (orphelines)
--   E  get_or_create_club_chat : contrôle d'appartenance au club
--   F  Stockage : suppression des policies SELECT larges (interdiction du listing anonyme)
--   G  Compteurs d'événements : RPC atomiques event_join_atomic / event_leave_atomic
--   H  REVOKE/GRANT explicite sur toutes les fonctions du schéma public
-- ---------------------------------------------------------------------------

BEGIN;

-- ===========================================================================
-- 0. Table de rate limiting pour notify_user (appelant → fenêtre 1h → 20 max)
-- ===========================================================================
CREATE TABLE IF NOT EXISTS public.notification_rate_limit (
  caller_id    uuid      PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  window_start timestamptz NOT NULL DEFAULT now(),
  count        integer   NOT NULL DEFAULT 0,
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_rate_limit ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notification_rate_limit_own" ON public.notification_rate_limit;
CREATE POLICY "notification_rate_limit_own"
ON public.notification_rate_limit
FOR SELECT TO authenticated
USING (caller_id = auth.uid());

-- ===========================================================================
-- A. notify_user — durcissement (remplace la version 016)
-- ===========================================================================
REVOKE ALL ON FUNCTION public.notify_user(uuid, text, text, text, jsonb) FROM PUBLIC, anon;

DROP FUNCTION IF EXISTS public.notify_user(uuid, text, text, text, jsonb);

CREATE OR REPLACE FUNCTION public.notify_user(
  p_user_id uuid,
  p_type    text,
  p_title   text DEFAULT NULL,
  p_body    text DEFAULT NULL,
  p_data    jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller     uuid   := auth.uid();
  v_count      integer;
  v_window     timestamptz;
  v_now        timestamptz := now();
  v_allowed    boolean     := false;
BEGIN
  -- 1. Authentification obligatoire
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'notify_user: authentification requise';
  END IF;

  -- 2. La cible doit exister et ne pas être supprimée
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'notify_user: utilisateur cible introuvable';
  END IF;

  -- 3. Blocage bidirectionnel : pas de notification entre utilisateurs bloqués
  IF EXISTS (
    SELECT 1 FROM public.blocked_users bu
    WHERE (bu.blocker_id = v_caller AND bu.blocked_id = p_user_id)
       OR (bu.blocker_id = p_user_id AND bu.blocked_id = v_caller)
  ) THEN
    RAISE EXCEPTION 'notify_user: utilisateurs bloqués';
  END IF;

  -- 4. Allow-list de types (synchronisée avec supabase/functions/send-notification)
  IF p_type NOT IN (
    'event_notification', 'event_invitation', 'event_cancelled', 'event_updated',
    'club_invitation', 'club_updated', 'club_member_left', 'club_member_removed',
    'event_participant_removed', 'join_request', 'message'
  ) THEN
    RAISE EXCEPTION 'notify_user: type non autorisé %', p_type;
  END IF;

  -- 5. Bornes sur title / body
  IF p_title IS NOT NULL AND length(p_title) > 120 THEN
    RAISE EXCEPTION 'notify_user: title trop long (max 120)';
  END IF;
  IF p_body IS NOT NULL AND length(p_body) > 500 THEN
    RAISE EXCEPTION 'notify_user: body trop long (max 500)';
  END IF;

  -- 6. data doit être un objet JSON (pas de tableau, pas de valeur scalaire)
  IF p_data IS NOT NULL AND jsonb_typeof(p_data) <> 'object' THEN
    RAISE EXCEPTION 'notify_user: data doit être un objet JSON';
  END IF;

  -- 7. Règle de relation légitime
  -- 7a. Notification vers soi : toujours autorisée
  IF p_user_id = v_caller THEN
    v_allowed := true;

  -- 7b. Club : invitation (owner/admin uniquement) ou notification aux membres
  ELSIF p_type IN ('club_invitation', 'club_updated', 'club_member_left', 'club_member_removed')
        AND p_data ? 'club_id' THEN
    IF p_type = 'club_invitation' THEN
      PERFORM 1 FROM public.club_members cm
      WHERE cm.club_id   = (p_data->>'club_id')::uuid
        AND cm.user_id   = v_caller
        AND cm.role      IN ('owner', 'admin')
        AND cm.left_at IS NULL;
    ELSE
      PERFORM 1 FROM public.club_members cm
      WHERE cm.club_id   = (p_data->>'club_id')::uuid
        AND cm.user_id   = v_caller
        AND cm.left_at IS NULL;
    END IF;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'notify_user: aucun droit sur le club %', p_data->>'club_id';
    END IF;
    v_allowed := true;

  -- 7c. Événement : gestionnaire (créateur ou owner/admin du club éditeur)
  ELSIF p_type IN ('event_invitation', 'event_updated', 'event_cancelled',
                   'event_notification', 'event_participant_removed', 'join_request')
        AND p_data ? 'event_id' THEN
    PERFORM 1 FROM public.events e
    WHERE e.id = (p_data->>'event_id')::uuid
      AND (
        e.created_by = v_caller
        OR EXISTS (
          SELECT 1 FROM public.club_members cm
          WHERE cm.club_id   = COALESCE(e.publisher_club_id, e.club_id)
            AND cm.user_id   = v_caller
            AND cm.role      IN ('owner', 'admin')
            AND cm.left_at IS NULL
        )
      );
    IF NOT FOUND THEN
      RAISE EXCEPTION 'notify_user: aucun droit sur l\'événement %', p_data->>'event_id';
    END IF;
    v_allowed := true;

  ELSE
    RAISE EXCEPTION 'notify_user: relation appelant→cible non établie pour le type %', p_type;
  END IF;

  -- 8. Rate limiting : 20 notifications max par appelant et par heure glissante
  SELECT window_start, count INTO v_window, v_count
  FROM public.notification_rate_limit
  WHERE caller_id = v_caller;

  IF v_count IS NULL THEN
    INSERT INTO public.notification_rate_limit (caller_id, window_start, count, updated_at)
    VALUES (v_caller, v_now, 1, v_now);
  ELSIF v_window < v_now - interval '1 hour' THEN
    UPDATE public.notification_rate_limit
       SET window_start = v_now, count = 1, updated_at = v_now
     WHERE caller_id = v_caller;
  ELSIF v_count >= 20 THEN
    RAISE EXCEPTION 'notify_user: limite de débit atteinte (20 / heure)';
  ELSE
    UPDATE public.notification_rate_limit
       SET count = count + 1, updated_at = v_now
     WHERE caller_id = v_caller;
  END IF;

  -- 9. Insertion effective
  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (p_user_id, p_type, p_title, p_body, p_data);
END;
$$;

GRANT EXECUTE ON FUNCTION public.notify_user(uuid, text, text, text, jsonb) TO authenticated;

-- ===========================================================================
-- B. profile_private — table séparée pour les données sensibles (option retenue)
-- ===========================================================================
CREATE TABLE IF NOT EXISTS public.profile_private (
  user_id         uuid      PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           text,
  birth_date      date,
  push_token      text,
  height_cm       integer,
  weight_kg       numeric(5,2),
  discovery_source text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profile_private ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profile_private_own" ON public.profile_private;
CREATE POLICY "profile_private_own"
ON public.profile_private
FOR SELECT TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "profile_private_own_write" ON public.profile_private;
CREATE POLICY "profile_private_own_write"
ON public.profile_private
FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Backfill des données existantes depuis public.profiles
INSERT INTO public.profile_private (
  user_id, email, birth_date, push_token, height_cm, weight_kg,
  discovery_source, created_at, updated_at
)
SELECT
  id, email, birth_date, push_token, height_cm, weight_kg,
  discovery_source, created_at, updated_at
FROM public.profiles
ON CONFLICT (user_id) DO UPDATE SET
  email            = EXCLUDED.email,
  birth_date       = EXCLUDED.birth_date,
  push_token       = EXCLUDED.push_token,
  height_cm        = EXCLUDED.height_cm,
  weight_kg        = EXCLUDED.weight_kg,
  discovery_source = EXCLUDED.discovery_source,
  updated_at       = now();

-- Retrait des colonnes sensibles de public.profiles (source de vérité = profile_private / auth.users)
-- Le trigger d'immuabilité de birth_date (035) référence birth_date : il doit être retiré avant.
DROP TRIGGER IF EXISTS trg_profiles_birth_date_immutable ON public.profiles;
DROP FUNCTION IF EXISTS public.prevent_birth_date_update();

ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS email,
  DROP COLUMN IF EXISTS birth_date,
  DROP COLUMN IF EXISTS push_token,
  DROP COLUMN IF EXISTS height_cm,
  DROP COLUMN IF EXISTS weight_kg,
  DROP COLUMN IF EXISTS discovery_source;

-- ===========================================================================
-- C. profiles — suppression de profiles_select_public, policy unique + blocage bidirectionnel
-- ===========================================================================
DROP POLICY IF EXISTS "profiles_select_public" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;

CREATE POLICY "profiles_select"
ON public.profiles
FOR SELECT TO authenticated
USING (
    id = auth.uid()
    OR (
        is_public_profile = true
        AND deleted_at IS NULL
        -- L'appelant n'a pas bloqué la cible
        AND NOT EXISTS (
            SELECT 1 FROM public.blocked_users bu
            WHERE bu.blocker_id = auth.uid()
              AND bu.blocked_id = public.profiles.id
        )
        -- La cible n'a pas bloqué l'appelant
        AND NOT EXISTS (
            SELECT 1 FROM public.blocked_users bu
            WHERE bu.blocker_id = public.profiles.id
              AND bu.blocked_id = auth.uid()
        )
    )
);

-- Les policies d'insert/update restent inchangées (profil propre uniquement).

-- ===========================================================================
-- D. Suppression des RPC orphelins et non sécurisés (confirmées inutilisées côté client)
-- ===========================================================================
REVOKE ALL ON FUNCTION public.get_scored_feed(uuid, integer, integer, text) FROM PUBLIC, anon;
DROP FUNCTION IF EXISTS public.get_scored_feed(uuid, integer, integer, text);

REVOKE ALL ON FUNCTION public.get_conversation_other_participants(uuid, uuid[]) FROM PUBLIC, anon;
DROP FUNCTION IF EXISTS public.get_conversation_other_participants(uuid, uuid[]);



-- ===========================================================================
-- E. get_or_create_club_chat — contrôle d'appartenance au club
-- ===========================================================================
REVOKE ALL ON FUNCTION public.get_or_create_club_chat(uuid) FROM PUBLIC, anon;

DROP FUNCTION IF EXISTS public.get_or_create_club_chat(uuid);

CREATE OR REPLACE FUNCTION public.get_or_create_club_chat(p_club_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conv_id    uuid;
  v_club_name  text;
  v_club_logo  text;
BEGIN
  -- L'appelant doit être membre du club (owner, admin ou member), pas encore parti
  IF NOT EXISTS (
    SELECT 1 FROM public.club_members cm
    WHERE cm.club_id   = p_club_id
      AND cm.user_id   = auth.uid()
      AND cm.left_at IS NULL
  ) THEN
    RAISE EXCEPTION 'get_or_create_club_chat: membre du club requis';
  END IF;

  -- Réutiliser un chat existant pour ce club
  SELECT id INTO v_conv_id
  FROM public.conversations
  WHERE club_id = p_club_id
  LIMIT 1;

  IF v_conv_id IS NOT NULL THEN
    RETURN v_conv_id;
  END IF;

  SELECT name, logo_url INTO v_club_name, v_club_logo
  FROM public.clubs
  WHERE id = p_club_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Club introuvable';
  END IF;

  INSERT INTO public.conversations (is_group, group_name, group_photo_url, club_id)
  VALUES (true, v_club_name, v_club_logo, p_club_id)
  RETURNING id INTO v_conv_id;

  RETURN v_conv_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_or_create_club_chat(uuid) TO authenticated;

-- ===========================================================================
-- G. Compteurs d'événements — RPC atomiques (remplacent le read-modify-write client)
-- ===========================================================================
-- event_join_atomic : inscription d'un participant (idempotent).
-- Le trigger trg_event_participants_ai (migration 017) maintient accepted_count.
REVOKE ALL ON FUNCTION public.event_join_atomic(uuid, uuid) FROM PUBLIC, anon;
DROP FUNCTION IF EXISTS public.event_join_atomic(uuid, uuid);

CREATE OR REPLACE FUNCTION public.event_join_atomic(
  p_event_id uuid,
  p_user_id  uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_places_total   integer;
  v_accepted_count integer;
BEGIN
  SELECT places_total, accepted_count INTO v_places_total, v_accepted_count
  FROM public.events
  WHERE id = p_event_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Événement introuvable';
  END IF;

  IF v_places_total IS NOT NULL AND v_accepted_count >= v_places_total THEN
    RAISE EXCEPTION 'Événement complet, plus de places disponibles';
  END IF;

  INSERT INTO public.event_participants (event_id, user_id, status)
  VALUES (p_event_id, p_user_id, 'going')
  ON CONFLICT (event_id, user_id) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.event_join_atomic(uuid, uuid) TO authenticated;

-- event_leave_atomic : retrait d'un participant.
-- Le trigger trg_event_participants_ad (migration 017) maintient accepted_count.
REVOKE ALL ON FUNCTION public.event_leave_atomic(uuid, uuid) FROM PUBLIC, anon;
DROP FUNCTION IF EXISTS public.event_leave_atomic(uuid, uuid);

CREATE OR REPLACE FUNCTION public.event_leave_atomic(
  p_event_id uuid,
  p_user_id  uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.event_participants
  WHERE event_id = p_event_id
    AND user_id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.event_leave_atomic(uuid, uuid) TO authenticated;


-- ===========================================================================
-- H. REVOKE / GRANT explicite sur toutes les fonctions du schéma public
-- check_username_available reste à authenticated (appel pré-session, voir 059)
-- ===========================================================================
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT n.nspname AS schema_name,
           p.proname AS func_name,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %I.%I(%s) FROM PUBLIC, anon',
                   r.schema_name, r.func_name, r.args);
  END LOOP;
END $$;

-- Grants explicits destinés au client authentifié
GRANT EXECUTE ON FUNCTION public.check_username_available(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_club_chat(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.notify_user(uuid, text, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_my_account(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.leave_group_conversation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_conversations_full(boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.management_member_statuses() TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_is_club_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_manages_event(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_post_like(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_post_comment(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.edit_post_comment(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.event_join_atomic(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.event_leave_atomic(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_all_user_stats() TO service_role;

-- ===========================================================================
-- F. Stockage — suppression des policies SELECT larges (interdit le listing anonyme)
-- Les URLs directes de buckets publics continuent de fonctionner ; seule la
-- lecture via PostgREST / listing d'objets est bloquée pour les non-membres.
-- ===========================================================================
DROP POLICY IF EXISTS "Avatars public read" ON storage.objects;
DROP POLICY IF EXISTS "Posts public read" ON storage.objects;
DROP POLICY IF EXISTS "Public profiles read" ON storage.objects;
DROP POLICY IF EXISTS "Group photos read" ON storage.objects;
DROP POLICY IF EXISTS "Clubs read" ON storage.objects;
DROP POLICY IF EXISTS "Events read" ON storage.objects;

-- (Optionnel, décommenter si le listing côté app doit rester possible pour les authentifiés)
-- CREATE POLICY "Avatars read authenticated" ON storage.objects
--   FOR SELECT TO authenticated USING (bucket_id = 'avatars');
-- CREATE POLICY "Posts read authenticated" ON storage.objects
--   FOR SELECT TO authenticated USING (bucket_id = 'posts');


COMMIT;

-- ============================================================================
-- REVERSAL (down migration) — décommenter uniquement en cas de rollback
-- ============================================================================
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS discovery_source text;
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS weight_kg numeric(5,2);
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS height_cm integer;
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS push_token text;
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS birth_date date;
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;
--
-- CREATE OR REPLACE FUNCTION public.prevent_birth_date_update()
-- RETURNS TRIGGER LANGUAGE plpgsql AS $$
-- BEGIN
--   IF OLD.birth_date IS DISTINCT FROM NEW.birth_date THEN
--     RAISE EXCEPTION 'birth_date is immutable after account creation';
--   END IF;
--   RETURN NEW;
-- END $$;
--
-- CREATE TRIGGER trg_profiles_birth_date_immutable
-- BEFORE UPDATE ON public.profiles FOR EACH ROW
-- EXECUTE FUNCTION public.prevent_birth_date_update();
--
-- DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
-- CREATE POLICY "profiles_select_authenticated" ON public.profiles FOR SELECT TO authenticated
--   USING (deleted_at IS NULL);
-- CREATE POLICY "profiles_select_public" ON public.profiles FOR SELECT TO authenticated
--   USING (is_public_profile = true AND deleted_at IS NULL);
--
-- DROP TABLE IF EXISTS public.profile_private;
-- DROP TABLE IF EXISTS public.notification_rate_limit;
--
-- DROP FUNCTION IF EXISTS public.event_join_atomic(uuid, uuid);
-- DROP FUNCTION IF EXISTS public.event_leave_atomic(uuid, uuid);
-- DROP FUNCTION IF EXISTS public.get_or_create_club_chat(uuid);
-- DROP FUNCTION IF EXISTS public.get_conversation_other_participants(uuid, uuid[]);
-- DROP FUNCTION IF EXISTS public.notify_user(uuid, text, text, text, jsonb);
--
-- -- Restaurer la version 016 de notify_user :
-- CREATE OR REPLACE FUNCTION public.notify_user(
--   p_user_id uuid, p_type text, p_title text DEFAULT NULL,
--   p_body text DEFAULT NULL, p_data jsonb DEFAULT '{}'::jsonb
-- ) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
-- BEGIN
--   INSERT INTO public.notifications (user_id, type, title, body, data)
--   VALUES (p_user_id, p_type, p_title, p_body, p_data);
-- END $$;
-- GRANT EXECUTE ON FUNCTION public.notify_user(uuid, text, text, text, jsonb) TO authenticated;
--
-- -- Restaurer get_scored_feed / get_conversation_other_participants (versions 002 / 008)
-- -- et recréer les policies SELECT publiques sur storage.objects.
-- ============================================================================
