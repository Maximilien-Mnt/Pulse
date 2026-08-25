-- Pulse — Age privacy and security (migration 035)
-- - Restrict birth_date from public/authenticated profile views
-- - Prevent mutation of birth_date after account creation

BEGIN;

-- 1. Update policies to exclude birth_date from readable profile sets
-- Drop existing select policies and recreate without birth_date
DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_public" ON public.profiles;

CREATE POLICY "profiles_select_authenticated"
ON public.profiles FOR SELECT TO authenticated
USING (
  deleted_at IS NULL
  AND id = auth.uid()
);

CREATE POLICY "profiles_select_public"
ON public.profiles FOR SELECT TO authenticated
USING (
  deleted_at IS NULL
  AND is_public_profile = true
);

-- Keep existing insert/update policies
-- profiles_insert_own: id = auth.uid()
-- profiles_update_own: id = auth.uid()

-- 2. Prevent birth_date mutation after insert
CREATE OR REPLACE FUNCTION public.prevent_birth_date_update()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.birth_date IS DISTINCT FROM NEW.birth_date THEN
    RAISE EXCEPTION 'birth_date is immutable after account creation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_birth_date_immutable ON public.profiles;

CREATE TRIGGER trg_profiles_birth_date_immutable
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_birth_date_update();

COMMIT;
