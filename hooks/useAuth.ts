import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { posthog } from "@/src/config/posthog";
import { useEffect } from "react";
import { loadPendingSignup, completeSignup } from "@/utils/signup";

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
    const { data } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const user = session?.user;
      const userId = user?.id ?? null;
      if (userId) posthog.identify(userId);
      setUserId(userId);
      setInitialized(true);

      // Replay any pending signup data after email confirmation
      if (user?.email) {
        const pending = await loadPendingSignup();
        if (pending) {
          try {
            // Use the confirmed user ID instead of the temp UUID
            const profile = { ...pending.profile, id: user.id };
            const payload = { ...pending, profile };
            await completeSignup(payload);
            console.log("Pending signup replayed for", user.email);
          } catch (err) {
            console.error("Failed to replay pending signup:", err);
          }
        }
      }
    });
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, [setInitialized, setUserId]);

  return { userId, initialized };
}
