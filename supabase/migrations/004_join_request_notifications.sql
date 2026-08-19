-- Pulse V4 — notifications pour demandes d'adhésion aux clubs/events privés

-- ─── Trigger function pour notifier le créateur d'un club/event ─────────────────

CREATE OR REPLACE FUNCTION public.notify_join_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_user_id uuid;
  v_target_name text;
  v_sender_name text;
  v_entity_name text;
  v_type text;
  v_title text;
  v_body text;
BEGIN
  -- Déterminer le type et récupérer les infos du club/event
  IF TG_TABLE_NAME = 'club_join_requests' THEN
    SELECT c.created_by, c.name INTO v_target_user_id, v_entity_name
    FROM public.clubs c WHERE c.id = NEW.club_id;

    IF v_target_user_id IS NULL THEN
      RETURN NEW;
    END IF;

    -- Vérifier que le club est privé
    IF NOT EXISTS (SELECT 1 FROM public.clubs WHERE id = NEW.club_id AND is_private = true) THEN
      RETURN NEW;
    END IF;

    v_type := 'club_join_request';
    v_title := 'Demande d''adhésion';
    v_body := format('Quelqu''un demande à rejoindre le club %s', left(v_entity_name, 50));

  ELSIF TG_TABLE_NAME = 'event_join_requests' THEN
    SELECT e.created_by, e.name INTO v_target_user_id, v_entity_name
    FROM public.events e WHERE e.id = NEW.event_id;

    IF v_target_user_id IS NULL THEN
      RETURN NEW;
    END IF;

    -- Vérifier que l'event est privé
    IF NOT EXISTS (SELECT 1 FROM public.events WHERE id = NEW.event_id AND is_private = true) THEN
      RETURN NEW;
    END IF;

    v_type := 'event_join_request';
    v_title := 'Demande de participation';
    v_body := format('Quelqu''un demande à participer à l''événement %s', left(v_entity_name, 50));
  ELSE
    RETURN NEW;
  END IF;

  -- Ne pas notifier si la demande vient du créateur lui-même
  IF v_target_user_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  -- Récupérer le nom de l'expéditeur
  SELECT full_name INTO v_sender_name
  FROM public.profiles
  WHERE id = NEW.user_id;

  IF v_sender_name IS NOT NULL THEN
    v_body := format('%s demande à rejoindre %s', left(v_sender_name, 30), left(v_entity_name, 40));
  END IF;

  -- Insérer la notification
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    body,
    data,
    read_at
  ) VALUES (
    v_target_user_id,
    v_type,
    v_title,
    v_body,
    jsonb_build_object(
      'request_id', NEW.id,
      'requester_id', NEW.user_id,
      'requester_name', COALESCE(v_sender_name, 'Utilisateur'),
      'club_id', CASE WHEN TG_TABLE_NAME = 'club_join_requests' THEN NEW.club_id END,
      'event_id', CASE WHEN TG_TABLE_NAME = 'event_join_requests' THEN NEW.event_id END,
      'club_name', CASE WHEN TG_TABLE_NAME = 'club_join_requests' THEN v_entity_name END,
      'event_name', CASE WHEN TG_TABLE_NAME = 'event_join_requests' THEN v_entity_name END,
      'status', NEW.status
    ),
    NULL
  );

  -- NOTE: pour les push notifs en arrière-plan, appeler l'edge function
  -- depuis le client via Supabase Realtime, ou utiliser un Supabase webhook
  -- sur la table notifications pour déclencher /functions/v1/send-notification.
  -- Ne pas bloquer la demande d'adhésion si la notif échoue.

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Ne pas bloquer la création de la demande si la notification échoue
    RETURN NEW;
END;
$$;


-- ─── Triggers ──────────────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS trg_club_join_request_notify ON public.club_join_requests;
CREATE TRIGGER trg_club_join_request_notify
  AFTER INSERT ON public.club_join_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_join_request();

DROP TRIGGER IF EXISTS trg_event_join_request_notify ON public.event_join_requests;
CREATE TRIGGER trg_event_join_request_notify
  AFTER INSERT ON public.event_join_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_join_request();

-- ─── RLS Policies pour notifications ───────────────────────────────────────────

-- Les utilisateurs ne voient que leurs propres notifications
CREATE POLICY "notifications_select_own"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

-- Les utilisateurs peuvent marquer leurs notifications comme lues
CREATE POLICY "notifications_update_own"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid());

-- Lecture seule pour les anonymes (aucune notification)
CREATE POLICY "notifications_anon_none"
  ON public.notifications FOR ALL
  TO anon
  USING (false);

-- ─── Index pour améliorer les performances ─────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_read
  ON public.notifications (user_id, read_at)
  WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_club_join_requests_status
  ON public.club_join_requests (club_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_event_join_requests_status
  ON public.event_join_requests (event_id, status, created_at DESC);