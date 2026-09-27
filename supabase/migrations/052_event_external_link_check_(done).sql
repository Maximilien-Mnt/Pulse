-- Pulse — enforce external event link (additive, rollback-safe)
-- External events (is_external = true) created via the app must carry a registration_url.
-- Synced/imported rows use source_url, so only enforce when source_url IS NULL
-- (i.e. user-created events), keeping the sync pipeline untouched.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'events_external_link_check'
  ) THEN
    ALTER TABLE public.events
      ADD CONSTRAINT events_external_link_check CHECK (
        is_external = false
        OR registration_url IS NOT NULL AND btrim(registration_url) <> ''
        OR source_url IS NOT NULL
      );
  END IF;
END $$;
