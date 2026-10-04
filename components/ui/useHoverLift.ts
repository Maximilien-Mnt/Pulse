// ---------------------------------------------------------------------------
// PULSE DESIGN SYSTEM — useHoverLift
//
// Shared hover/focus lift for buttons that own their transform inline: the
// Create button in both of its shapes (icon-only circle in the collapsed rail
// and in the bottom bar, icon+label pill in the expanded rail).
//
// Engagement rules mirror the shared <IconButton> language
// (components/ui/IconButton.tsx):
//   - pointer hover engages on web only; keyboard focus engages on every
//     platform, so the affordance is never mouse-only,
//   - the surface scales to ICON_BUTTON_SCALE_HOVER over the shared 150ms
//     `transition-transform` fade — the same timing as the `transition-colors`
//     surface swaps elsewhere,
//   - under prefers-reduced-motion the state still changes, it just snaps:
//     the transition classes drop, the scale stays.
//
// The scale travels as an inline `transform` fragment (always an array) so it
// composes with transforms the caller already owns — the tab-bar FAB lifts
// itself above the bar — and it can never drift from ICON_BUTTON_SCALE_HOVER.
// Inline rather than a Tailwind class also keeps it clear of the plain
// Pressable: react-native-web never serialises the Animated.Value inside the
// PressableScale style, so this transform is the one that actually renders.
//
// Owning `transform` also means the PressableScale press squash cannot paint
// on this control — deliberate; the click animation is a separate pass.
// ---------------------------------------------------------------------------

import { useCallback, useRef, useState } from "react";
import { Platform } from "react-native";
import type { PressableProps } from "react-native";

import {
  ICON_BUTTON_SCALE_HOVER,
} from "@/components/ui/IconButton";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/utils/format";

export interface HoverLift {
  /** True while hovered (web pointer) or keyboard-focused. */
  lifted: boolean;
  /** Spread onto the pressable: hover (web) + focus/blur (every platform). */
  hoverProps: Pick<
    PressableProps,
    "onHoverIn" | "onHoverOut" | "onFocus" | "onBlur"
  >;
  /**
   * Inline `transform` fragment — always an array (`scale: 1` at rest) so
   * callers can spread it into a transform list they already maintain.
   */
  liftTransform: { scale: number }[];
  /**
   * Static transition classes for the surface. Empty of transition under
   * reduced motion so the lift snaps instead of fading.
   */
  liftTransitionClassName: string;
}

export function useHoverLift(): HoverLift {
  const reduceMotion = useReducedMotion();
  const [lifted, setLifted] = useState(false);
  const liftedRef = useRef(false);
  const isWeb = Platform.OS === "web";

  const setTo = useCallback((next: boolean) => {
    if (liftedRef.current === next) return;
    liftedRef.current = next;
    setLifted(next);
  }, []);

  return {
    lifted,
    hoverProps: {
      // Hover is a pointer concept (web only); keyboard focus gets the same
      // affordance on every platform — same rule as IconButton / NavTab.
      onHoverIn: isWeb ? () => setTo(true) : undefined,
      onHoverOut: isWeb ? () => setTo(false) : undefined,
      onFocus: () => setTo(true),
      onBlur: () => setTo(false),
    },
    liftTransform: [{ scale: lifted ? ICON_BUTTON_SCALE_HOVER : 1 }],
    liftTransitionClassName: cn(
      !reduceMotion && "transition-transform",
      "duration-150"
    ),
  };
}
