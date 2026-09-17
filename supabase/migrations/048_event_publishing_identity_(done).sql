-- Membership self-service must not grant admin publishing privileges.
CREATE FUNCTION public.validate_club_admin_membership()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.role = 'admin' AND auth.uid() IS NOT NULL THEN
    IF TG_OP = 'UPDATE' THEN
      IF OLD.role = 'admin' AND NEW.user_id = OLD.user_id AND NEW.club_id = OLD.club_id THEN RETURN NEW; END IF;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.clubs c WHERE c.id = NEW.club_id AND c.created_by = auth.uid()) THEN
      RAISE EXCEPTION 'Only the club owner can grant admin membership' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.validate_club_admin_membership() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER validate_club_admin_membership BEFORE INSERT OR UPDATE ON public.club_members
FOR EACH ROW EXECUTE FUNCTION public.validate_club_admin_membership();


-- Keep the human operator for existing permissions; club publishing is opt-in.
ALTER TABLE public.events ADD COLUMN publisher_club_id uuid REFERENCES public.clubs(id);
CREATE INDEX events_publisher_club_id_idx ON public.events(publisher_club_id) WHERE publisher_club_id IS NOT NULL;

CREATE FUNCTION public.get_event_publishing_clubs()
RETURNS TABLE(id uuid, name text, logo_url text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT c.id, c.name, c.logo_url FROM public.clubs c
  WHERE auth.uid() IS NOT NULL AND (
    c.created_by = auth.uid() OR EXISTS (
      SELECT 1 FROM public.club_members m
      WHERE m.club_id = c.id AND m.user_id = auth.uid() AND m.role = 'admin'
    )
  ) ORDER BY c.name, c.id;
$$;
REVOKE ALL ON FUNCTION public.get_event_publishing_clubs() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_event_publishing_clubs() TO authenticated;

CREATE FUNCTION public.validate_event_publisher()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  -- Existing publishing attribution cannot be silently replaced by an edit.
  IF TG_OP = 'UPDATE' THEN
    IF NEW.publisher_club_id IS DISTINCT FROM OLD.publisher_club_id THEN
      RAISE EXCEPTION 'Event publishing identity cannot be changed' USING ERRCODE = '42501';
    END IF;
    IF NEW.publisher_club_id IS NOT NULL AND NEW.club_id IS DISTINCT FROM NEW.publisher_club_id THEN
      RAISE EXCEPTION 'Publishing club must match linked club' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.publisher_club_id IS NOT NULL THEN
    IF auth.uid() IS NULL OR NEW.created_by IS DISTINCT FROM auth.uid() OR NOT EXISTS (
      SELECT 1 FROM public.get_event_publishing_clubs() c WHERE c.id = NEW.publisher_club_id
    ) THEN
      RAISE EXCEPTION 'Only club owners and admins can publish as this club' USING ERRCODE = '42501';
    END IF;
    IF NEW.club_id IS DISTINCT FROM NEW.publisher_club_id THEN
      RAISE EXCEPTION 'Publishing club must match linked club' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.validate_event_publisher() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER validate_event_publisher BEFORE INSERT OR UPDATE ON public.events
FOR EACH ROW EXECUTE FUNCTION public.validate_event_publisher();

-- A visible event exposes only its club's public attribution (name/logo), even
-- when the private club's full profile is not accessible to the viewer.
CREATE FUNCTION public.get_event_club_publishers(p_event_ids uuid[])
RETURNS TABLE(event_id uuid, id uuid, name text, logo_url text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT e.id, c.id, c.name, c.logo_url
  FROM public.events e JOIN public.clubs c ON c.id = e.publisher_club_id
  WHERE auth.uid() IS NOT NULL AND e.id = ANY(p_event_ids) AND (
    NOT e.is_private OR e.created_by = auth.uid() OR EXISTS (
      SELECT 1 FROM public.event_participants p WHERE p.event_id = e.id AND p.user_id = auth.uid()
    )
  );
$$;
REVOKE ALL ON FUNCTION public.get_event_club_publishers(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_event_club_publishers(uuid[]) TO authenticated;
