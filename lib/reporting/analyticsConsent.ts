// ---------------------------------------------------------------------------
// PULSE — Analytics consent (GDPR opt-out)
//
// Default ON (matches current behaviour); user can opt out in settings.
// Reporting helpers check this before sending anything to PostHog.
// ---------------------------------------------------------------------------

import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

const CONSENT_KEY = "pulse:analytics-consent";

type ConsentState = {
  /** Analytics allowed. Default true (opt-out model). */
  enabled: boolean;
  hydrated: boolean;
  setEnabled: (v: boolean) => void;
  hydrate: () => Promise<void>;
};

async function persist(v: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(CONSENT_KEY, v ? "1" : "0");
  } catch {
    // ignore
  }
}

export const useAnalyticsConsentStore = create<ConsentState>()((set) => ({
  enabled: true,
  hydrated: false,
  setEnabled: (enabled) => {
    set({ enabled });
    void persist(enabled);
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { posthog, isPostHogConfigured } = require("@/src/config/posthog") as {
        posthog?: { optOut?: () => void; optIn?: () => void };
        isPostHogConfigured?: boolean;
      };
      if (isPostHogConfigured) {
        if (enabled) posthog?.optIn?.();
        else posthog?.optOut?.();
      }
    } catch {
      // best-effort
    }
  },
  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(CONSENT_KEY);
      if (raw === "0") set({ enabled: false, hydrated: true });
      else set({ hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },
}));

/** Synchronous read for non-React contexts (reporters). */
export function isAnalyticsEnabled(): boolean {
  try {
    return useAnalyticsConsentStore.getState().enabled;
  } catch {
    return true;
  }
}
