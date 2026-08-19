-- Pulse V17 — Event places capacity enforcement
-- Adds accepted_count to events and blocks join requests when the event is full.

-- ─── Add accepted_count column ────────────────────────────────────────────────

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS accepted_count integer NOT NULL DEFAULT 0;

-- Backfill accepted_count from existing event_participants rows
UPDATE public.events e
SET accepted_count = (
  SELECT count(*)::int
  FROM public.event_participants ep
  WHERE ep.event_id = e.id
);

-- ─── Trigger: keep accepted_count in sync with event_participants ─────────────

CREATE OR REPLACE FUNCTION public.refresh_event_accepted_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id uuid;
BEGIN
  v_event_id := COALESCE(NEW.event_id, OLD.event_id);

  UPDATE public.events e
  SET accepted_count = (
    SELECT count(*)::int
    FROM public.event_participants ep
    WHERE ep.event_id = v_event_id
  )
  WHERE e.id = v_event_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_event_participants_ai ON public.event_participants;
CREATE TRIGGER trg_event_participants_ai
  AFTER INSERT ON public.event_participants
  FOR EACH ROW EXECUTE FUNCTION public.refresh_event_accepted_count();

DROP TRIGGER IF EXISTS trg_event_participants_ad ON public.event_participants;
CREATE TRIGGER trg_event_participants_ad
  AFTER DELETE ON public.event_participants
  FOR EACH ROW EXECUTE FUNCTION public.refresh_event_accepted_count();

-- ─── Trigger: block join requests when the event is full ──────────────────────

CREATE OR REPLACE FUNCTION public.block_join_request_when_full()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_places_total integer;
  v_accepted_count integer;
BEGIN
  SELECT places_total, accepted_count
    INTO v_places_total, v_accepted_count
  FROM public.events
  WHERE id = NEW.event_id;

  -- Only enforce when the event has a limited number of places
  IF v_places_total IS NOT NULL AND v_accepted_count >= v_places_total THEN
    RAISE EXCEPTION 'Cet événement est complet, plus de places disponibles';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_event_join_request_capacity ON public.event_join_requests;
CREATE TRIGGER trg_event_join_request_capacity
  BEFORE INSERT ON public.event_join_requests
  FOR EACH ROW EXECUTE FUNCTION public.block_join_request_when_full();