// ---------------------------------------------------------------------------
// PULSE — Online / offline status hook
//
// Single source of truth for connectivity. Uses @react-native-community/netinfo
// on native and navigator.onLine on web. Logs transitions without user data.
// ---------------------------------------------------------------------------

import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { queryClient } from "@/lib/queryClient";
import { logger } from "@/lib/reporting/logger";

type OnlineStatus = {
  online: boolean;
  /** Timestamp of the last connectivity transition (for UI / logging only). */
  transitionedAt: number | null;
};

/**
 * Returns the current connectivity state.
 *
 * On native we subscribe to NetInfo so the component re-renders on every
 * connection change. On web we fall back to the browser's navigator.onLine
 * plus the window "online" / "offline" events.
 */
export function useOnlineStatus(): OnlineStatus {
  const [state, setState] = useState<OnlineStatus>({
    online: true,
    transitionedAt: null,
  });
  const prevOnlineRef = useRef(true);

  useEffect(() => {
    if (Platform.OS === "web") {
      // Initial value from the browser.
      if (typeof navigator !== "undefined" && "onLine" in navigator) {
        setState((prev) => ({
          ...prev,
          online: navigator.onLine,
          transitionedAt: prev.transitionedAt ?? Date.now(),
        }));
      }

      const onOnline = () => {
        const prev = navigator.onLine;
        setState((s) => ({
          online: true,
          transitionedAt: Date.now(),
        }));
        if (!prev) {
          // Reconnect: invalidate stale queries so fresh data flows in.
          // We keep it conservative — only invalidate the read-only query
          // prefixes that are safe to refresh. Mutations that were refused
          // offline are NOT auto-retried here (caller must retry explicitly).
          void queryClient.invalidateQueries({ queryKey: ["feed"] });
          void queryClient.invalidateQueries({ queryKey: ["clubs"] });
          void queryClient.invalidateQueries({ queryKey: ["events"] });
          void queryClient.invalidateQueries({ queryKey: ["profile"] });
          void queryClient.invalidateQueries({ queryKey: ["public-profile"] });
          logger.info("useOnlineStatus", "reconnected — invalidated read-only query prefixes");
        }
      };

      const onOffline = () => {
        setState((s) => ({
          ...s,
          online: false,
          transitionedAt: Date.now(),
        }));
        logger.info("useOnlineStatus", "went offline");
      };

      window.addEventListener("online", onOnline);
      window.addEventListener("offline", onOffline);
      return () => {
        window.removeEventListener("online", onOnline);
        window.removeEventListener("offline", onOffline);
      };
    }

    // Native: subscribe to NetInfo connection type changes.
    let alive = true;
    let unsubscribe: (() => void) | undefined;

    const applyState = (online: boolean) => {
      const wasOffline = !prevOnlineRef.current && online;
      prevOnlineRef.current = online;
      setState({
        online,
        transitionedAt: Date.now(),
      });
      if (!online) {
        logger.info("useOnlineStatus", "went offline");
      } else if (wasOffline) {
        // Reconnected on native: refresh read-only prefixes. Refused
        // destructive mutations are NOT auto-retried here.
        void queryClient.invalidateQueries({ queryKey: ["feed"] });
        void queryClient.invalidateQueries({ queryKey: ["clubs"] });
        void queryClient.invalidateQueries({ queryKey: ["events"] });
        void queryClient.invalidateQueries({ queryKey: ["profile"] });
        void queryClient.invalidateQueries({ queryKey: ["public-profile"] });
        logger.info("useOnlineStatus", "reconnected — invalidated read-only query prefixes");
      }
    };

    const listener = (state: { isConnected?: boolean | null }) => {
      if (alive) applyState(!!state.isConnected);
    };

    unsubscribe = NetInfo.addEventListener(listener);

    // Pop the initial value synchronously so the first render is correct.
    let resolved = false;
    const resolve = async () => {
      if (!alive || resolved) return;
      try {
        const info = await NetInfo.fetch();
        resolved = true;
        applyState(!!info.isConnected);
      } catch {
        // If we can't even fetch, assume offline.
        resolved = true;
        applyState(false);
      }
    };
    void resolve();

    return () => {
      alive = false;
      unsubscribe?.();
    };
  }, []);

  return state;
}
