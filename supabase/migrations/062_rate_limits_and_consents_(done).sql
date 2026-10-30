-- ---------------------------------------------------------------------------
-- Migration 062 — Rate limits, user consents, and signup hardening
-- ---------------------------------------------------------------------------
-- Appliquer d'abord en staging, puis en prod. Idempotent pour pouvoir être rejouée.
-- Couverture des constats d'audit :
--   signup : rate limiter persistant (IP + device), stockage consentement,
--            CAPTCHA requis pour toute requête non native, politique de mot de passe NIST.
-- ---------------------------------------------------------------------------

BEGIN;

-- ===========================================================================
-- Table rate_limits : compteurs persistants pour le rate limiting côté Edge Functions
-- ===========================================================================
CREATE TABLE IF NOT EXISTS public.rate_limits (
  key_type   text NOT NULL,          -- 'signup_ip', 'signup_device', 'geocode_ip', 'notify_user'
  key_value  text NOT NULL,          -- IP, deviceId, caller_id...
  count      integer NOT NULL DEFAULT 0,
  window_start timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (key_type, key_value)
);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Seule la fonction check_rate_limit (service_role) peut lire/écrire cette table
DROP POLICY IF EXISTS "rate_limits_service_only" ON public.rate_limits;
CREATE POLICY "rate_limits_service_only"
ON public.rate_limits
FOR ALL TO service_role
USING (true);

GRANT SELECT, INSERT, UPDATE ON public.rate_limits TO service_role;

-- ===========================================================================
-- Table user_consents : preuve de consentement (RGPD)
-- ===========================================================================
CREATE TABLE IF NOT EXISTS public.user_consents (
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document     text NOT NULL,         -- 'terms', 'privacy'
  version      text NOT NULL,         -- version du document acceptée
  accepted_at  timestamptz NOT NULL DEFAULT now(),
  analytics    boolean NOT NULL DEFAULT false,
  PRIMARY KEY (user_id, document)
);

ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;

-- L'utilisateur ne peut lire/écrire que ses propres consentements
DROP POLICY IF EXISTS "user_consents_owner" ON public.user_consents;
CREATE POLICY "user_consents_owner"
ON public.user_consents
FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE ON public.user_consents TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_consents TO service_role;

-- ===========================================================================
-- RPC check_rate_limit : vérifie/incrémente le compteur rate-limit
-- Réservée à service_role (appelée depuis les Edge Functions)
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_key_type   text,
  p_key_value  text,
  p_limit      integer,
  p_window_secs integer
)
RETURNS TABLE (
  allowed boolean,
  remaining integer,
  reset_at  timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now   timestamptz := now();
  v_reset timestamptz;
  v_count integer;
BEGIN
  -- Nettoyer les entrées expirées de cette clé
  DELETE FROM public.rate_limits
  WHERE key_type = p_key_type
    AND key_value = p_key_value
    AND window_start + (p_window_secs * interval '1 second') < v_now;

  -- Lire le compteur actuel
  SELECT count, window_start
  INTO v_count, v_reset
  FROM public.rate_limits
  WHERE key_type = p_key_type
    AND key_value = p_key_value;

  IF v_count IS NULL THEN
    -- Première entrée pour cette clé
    INSERT INTO public.rate_limits (key_type, key_value, count, window_start, updated_at)
    VALUES (p_key_type, p_key_value, 1, v_now, v_now)
    RETURNING count INTO v_count;

    RETURN QUERY SELECT true, p_limit - 1, v_now + (p_window_secs * interval '1 second');
  ELSIF v_count >= p_limit THEN
    -- Limite atteinte
    RETURN QUERY SELECT false, 0, v_reset + (p_window_secs * interval '1 second');
  ELSE
    -- Incrémenter
    UPDATE public.rate_limits
    SET count = count + 1, updated_at = v_now
    WHERE key_type = p_key_type AND key_value = p_key_value
    RETURNING count INTO v_count;

    RETURN QUERY SELECT true, p_limit - v_count, v_reset + (p_window_secs * interval '1 second');
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.check_rate_limit(text, text, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, text, integer, integer) TO service_role;

COMMIT;

-- ============================================================================
-- REVERSAL (down migration)
-- ============================================================================
-- DROP POLICY IF EXISTS "user_consents_owner" ON public.user_consents;
-- DROP POLICY IF EXISTS "rate_limits_service_only" ON public.rate_limits;
-- DROP TABLE IF EXISTS public.user_consents;
-- DROP TABLE IF EXISTS public.rate_limits;
-- DROP FUNCTION IF EXISTS public.check_rate_limit(text, text, integer, integer);
