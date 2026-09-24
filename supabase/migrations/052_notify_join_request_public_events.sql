-- Pulse — Update notify_join_request to send notifications for both public and private events/clubs

CREATE OR REPLACE FUNCTION public.notify_join_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_user_id uuid;
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

    v_type := 'club_join_request';
    v_title := 'Demande d''adhésion';
    v_body := format('Quelqu''un demande à rejoindre le club %s', left(v_entity_name, 50));

  ELSIF TG_TABLE_NAME = 'event_join_requests' THEN
    SELECT e.created_by, e.name INTO v_target_user_id, v_entity_name
    FROM public.events e WHERE e.id = NEW.event_id;

    IF v_target_user_id IS NULL THEN
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

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NEW;
END;
$$;
