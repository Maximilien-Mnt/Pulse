-- Pulse — Bug reports table (idempotent setup)
--
-- Completely safe to run multiple times.
-- Every operation checks existence before executing.

-- Create profiles table if needed (foreign key dependency)
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Create bug_reports table if needed
CREATE TABLE IF NOT EXISTS public.bug_reports (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    message text NOT NULL,
    platform text NOT NULL,
    os_version text,
    app_version text NOT NULL,
    device_model text,
    locale text,
    screen_resolution text,
    timezone text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Only proceed if table was just created or already exists
DO $$
BEGIN
    -- Enable RLS
    ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;

    -- Create insert policy if not exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'bug_reports' 
        AND policyname = 'bug_reports_insert_own'
    ) THEN
        CREATE POLICY "bug_reports_insert_own"
            ON public.bug_reports FOR INSERT TO authenticated
            WITH CHECK (reporter_id = auth.uid());
    END IF;

    -- Create select policy if not exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'bug_reports' 
        AND policyname = 'bug_reports_select_own'
    ) THEN
        CREATE POLICY "bug_reports_select_own"
            ON public.bug_reports FOR SELECT TO authenticated
            USING (reporter_id = auth.uid());
    END IF;

    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_bug_reports_reporter_id
        ON public.bug_reports (reporter_id);
    
    CREATE INDEX IF NOT EXISTS idx_bug_reports_created_at
        ON public.bug_reports (created_at DESC);
END $$;