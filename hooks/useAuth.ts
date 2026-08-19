import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { posthog } from "@/src/config/posthog";
import { queryClient, removePersistedQueryCache } from "@/lib/queryClient";
import { useEffect, useRef } from "react";
import { loadPendingSignup, completeSignup } from "@/utils/signup";

/**
 * Initialise la session Supabase et synchronise le store auth local.
 *
 * IMPORTANT: this hook must be mounted ONCE at the app root (app/_layout.tsx)
 * so the Supabase auth listener stays alive for the entire application
 * lifetime. Previously it lived in app/index.tsx, which unmounts as soon as
 * the user navigates into the tabs — killing the listener and leaving the
 * auth store with a stale userId after switching accounts.
 */
export function useAuth() {
  const userId = useAuthStore((s) => s.userId);
  const initialized = useAuthStore((s) => s.initialized);
  const setUserId = useAuthStore((s) => s.setUserId);
  const setInitialized = useAuthStore((s) => s.setInitialized);
  const setRecoverySession = useAuthStore((s) => s.setRecoverySession);
  // Tracks the previously seen session user id so we can detect account
  // switches and wipe stale cached data (profiles, feeds, etc.).
  const prevUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    let alive = true;

    /**
     * Handle a session user change. Whenever the authenticated user id
     * transitions (sign-out, sign-in as a different account), clear the
     * whole React Query cache and the persisted offline cache so no data
     * from a previous account can ever leak into the new session.
     *
     * On the very first resolution (prev === null) we intentionally do NOT
     * clear, so cold-start offline cache restoration still works.
     */
    const handleSessionUser = (sessionUserId: string | null) => {
      const prev = prevUserIdRef.current;
      prevUserIdRef.current = sessionUserId;

      if (prev !== null && prev !== sessionUserId) {
        queryClient.clear();
        void removePersistedQueryCache();
      }
    };

    void supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      const sessionUserId = data.session?.user.id ?? null;
      handleSessionUser(sessionUserId);
      if (sessionUserId) posthog.identify(sessionUserId);
      setUserId(sessionUserId);
      setInitialized(true);
    });

    const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
      const user = session?.user;
      const sessionUserId = user?.id ?? null;

      // Handle password recovery flow: when the user clicks the reset link,
      // Supabase emits a PASSWORD_RECOVERY event (not in TS types but emitted at runtime).
      // We flag the recovery session so the reset-password screen can render the form.
      // We do NOT set userId here — the recovery session is temporary and should
      // not be treated as a fully authenticated session.
      if (event === ("PASSWORD_RECOVERY" as string)) {
        setRecoverySession(true);
        setInitialized(true);
        return;
      }

      // Clear the recovery session flag on any other auth event
      setRecoverySession(false);
      handleSessionUser(sessionUserId);
      setUserId(sessionUserId);
      setInitialized(true);

      // On sign-out: reset analytics. The query cache is already cleared
      // inside handleSessionUser.
      if (!sessionUserId) {
        posthog.reset();
        return;
      }

      posthog.identify(sessionUserId);
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
  }, [setInitialized, setUserId, setRecoverySession]);

  return { userId, initialized };
}