import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { posthog } from "@/src/config/posthog";
import { useEffect } from "react";

/**
 * Initialise la session Supabase et synchronise le store auth local.
 */
export function useAuth() {
  const userId = useAuthStore((s) => s.userId);
  const initialized = useAuthStore((s) => s.initialized);
  const setUserId = useAuthStore((s) => s.setUserId);
  const setInitialized = useAuthStore((s) => s.setInitialized);

  useEffect(() => {
    let alive = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      const userId = data.session?.user.id ?? null;
      if (userId) posthog.identify(userId);
      setUserId(userId);
      setInitialized(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const userId = session?.user.id ?? null;
      if (userId) posthog.identify(userId);
      setUserId(userId);
      setInitialized(true);
    });
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, [setInitialized, setUserId]);

  return { userId, initialized };
}
