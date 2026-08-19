-- Pulse — Bug reports table
--
-- Stores user-submitted bug reports with automatic device/context metadata.

CREATE TABLE IF NOT EXISTS public.bug_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  message text NOT NULL,
  -- Device & platform info
  platform text NOT NULL,
  os_version text,
  app_version text NOT NULL,
  device_model text,
  -- Additional context
  locale text,
  screen_resolution text,
  timezone text,
  -- Raw metadata for future extensibility
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bug_reports_insert_own"
  ON public.bug_reports FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "bug_reports_select_own"
  ON public.bug_reports FOR SELECT TO authenticated
  USING (reporter_id = auth.uid());

-- Index for user's reports
CREATE INDEX IF NOT EXISTS idx_bug_reports_reporter_id
  ON public.bug_reports (reporter_id);

-- Index for chronological sorting
CREATE INDEX IF NOT EXISTS idx_bug_reports_created_at
  ON public.bug_reports (created_at DESC);