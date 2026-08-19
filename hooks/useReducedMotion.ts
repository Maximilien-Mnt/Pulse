// ---------------------------------------------------------------------------
// PULSE — Reduced Motion Hook
//
// Respects prefers-reduced-motion on web and AccessibilityInfo on native.
// Returns true when animations should be disabled or reduced to simple fades.
// ---------------------------------------------------------------------------

import { useEffect, useState } from "react";
import { AccessibilityInfo, Platform } from "react-native";

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    // Web: check CSS media query
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      setReduced(mq.matches);
      const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }

    // Native: check AccessibilityInfo
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduced);
    const sub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduced,
    );
    return () => sub.remove();
  }, []);

  return reduced;
}