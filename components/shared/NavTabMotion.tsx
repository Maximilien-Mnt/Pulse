// ---------------------------------------------------------------------------
// PULSE DESIGN SYSTEM — Nav Tab Motion
//
// Shared micro-interaction + active-indicator behaviour for the app's two
// navigation bars (SideRail — vertical, web ≥768px; TabBar — bottom, mobile).
// Both render their tabs through <NavTab> so a tab feels identical everywhere,
// and the vertical rail gets the sliding active background for free.
//
// Motion language (inherited from components/ui/IconButton.tsx, which is the
// canonical reference — do not invent new timings here):
//   - Hover/focus: the surface LIFTS to the exact colour of the pressed state,
//     so hover and press read as one continuous control. Implemented as a JS
//     `hovered` state + class swap with a `transition-colors` fade — NOT a
//     Tailwind `hover:` variant, which is the repo-wide convention
//     (CoverOverlayActions / MessageBubble / IconButton all do it this way).
//   - Hover/focus: spring scale-up (ICON_BUTTON_SCALE_HOVER).
//   - Press: spring scale-down (ICON_BUTTON_SCALE_PRESS).
//   - All of it is gated by `useReducedMotion`: under reduced motion the
//     states still change, they just snap instead of animating.
//   - `prefers-reduced-motion` users get no sliding indicator either; the
//     active tab keeps a plain static tint so the selected state stays visible.
//
// The active indicator animates its `top` between measured row offsets, which
// means `useNativeDriver: false` — `top` is not a native-driver property. That
// is acceptable here: it is a single 4-item list, animating only while the
// selected tab changes.
// ---------------------------------------------------------------------------

import React, { useCallback, useRef, useState } from "react";
import { Animated, Platform, StyleSheet, View } from "react-native";
import type { PressableProps } from "react-native";

import {
  ICON_BUTTON_SCALE_HOVER,
  ICON_BUTTON_SCALE_PRESS,
  ICON_BUTTON_TRANSITION_MS,
} from "@/components/ui/IconButton";
import { PressableScale } from "@/components/ui/PressableScale";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/utils/format";
import { spacing } from "@/src/design-tokens/primitive/spacing";
import { radius } from "@/src/design-tokens/primitive/radius";

// ---------------------------------------------------------------------------
// Timing constants — the shared motion language
// ---------------------------------------------------------------------------

/**
 * Spring used to travel the active indicator between tabs. Deliberately
 * softer (lower tension, higher friction) than the press springs above: this
 * is positional travel across a list and should settle without a bounce, while
 * the press springs are short tactile pops that *should* feel springy.
 */
export const NAV_INDICATOR_SPRING = { friction: 7, tension: 170 } as const;

/** Resting surface for an inactive nav tab (hover lifts it from here). */
const TAB_REST_CLASS = "bg-transparent";
/** Hovered/pressed surface for an inactive nav tab. */
const TAB_LIFT_CLASS = "bg-neutral-100 dark:bg-neutral-800";

/**
 * Horizontal inset of the sliding indicator, matching the `px-3` (12px)
 * padding of the tab stack it is rendered into.
 */
export const INDICATOR_INSET = spacing[3];

/** Corner radius of the sliding indicator — matches the tab rows' `rounded-lg`. */
// ---------------------------------------------------------------------------
// NavTab
// ---------------------------------------------------------------------------

export interface NavTabProps extends Omit<PressableProps, "children" | "style"> {
  /**
   * When true the row is the selected tab. The selected row paints NO
   * background of its own — the sliding indicator owns that state — so the
   * two can never double up.
   */
  active: boolean;
  /** Row content. */
  children: React.ReactNode;
  /**
   * Rendered under the sliding indicator instead of on top of it, so the
   * active tint reads as one continuous rectangle behind the row content.
   */
  underlay?: boolean;
}

/**
 * A single navigation tab with the shared hover/focus/press treatment.
 * The whole row scales, which reads as the row itself being pressed rather
 * than just its icon.
 */
export function NavTab({
  active,
  children,
  underlay = false,
  onFocus,
  onBlur,
  className,
  ...rest
}: NavTabProps) {
  const [hovered, setHovered] = useState(false);
  const hoveredRef = useRef(false);

  // Hover is a pointer concept (web only); keyboard focus gets the same
  // affordance on every platform so the animation is never mouse-only. This
  // mirrors IconButton's internal setTo() exactly.
  const setTo = useCallback((next: boolean) => {
    if (hoveredRef.current === next) return;
    hoveredRef.current = next;
    setHovered(next);
  }, []);

  const isWeb = Platform.OS === "web";

  return (
    <PressableScale
      {...rest}
      // Springs + reduced-motion gating come from PressableScale.
      scaleOnPress={ICON_BUTTON_SCALE_PRESS}
      scaleOnHover={ICON_BUTTON_SCALE_HOVER}
      onHoverIn={isWeb ? () => setTo(true) : undefined}
      onHoverOut={isWeb ? () => setTo(false) : undefined}
      onFocus={(e) => {
        setTo(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setTo(false);
        onBlur?.(e);
      }}
      className={cn(
        "relative overflow-hidden rounded-lg",
        "transition-colors",
        `duration-${ICON_BUTTON_TRANSITION_MS}`,
        // The selected tab is painted by the sliding indicator; lifting it on
        // hover too would tint the row the user reads as "current", so the
        // active row stays flat.
        active || !hovered ? TAB_REST_CLASS : TAB_LIFT_CLASS,
        className
      )}
    >
      {underlay ? (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {children}
        </View>
      ) : (
        children
      )}
    </PressableScale>
  );
}

// ---------------------------------------------------------------------------
// useSlidingIndicator
// ---------------------------------------------------------------------------

/** Layout of one measured tab row. */
interface TabRowLayout {
  y: number;
  height: number;
}

/**
 * Drives the sliding active background for a vertical tab stack.
 *
 * Each tab reports its own `onLayout`; this hook keeps the most recent
 * measurements and animates a single indicator to the selected row. Row heights
 * can differ (the Create row is a separate pill), so the indicator animates
 * its own `height` rather than assuming a fixed size.
 *
 * The very first placement SNAPS into position instead of springing —
 * otherwise the tint would be seen flying in from offset 0 on mount.
 * Subsequent moves spring, including a collapse ↔ expand at the 1024px
 * breakpoint, which re-measures every row.
 */
export function useSlidingIndicator(count: number) {
  const reduceMotion = useReducedMotion();
  const layouts = useRef<Record<number, TabRowLayout>>({});
  const indicatorY = useRef(new Animated.Value(0)).current;
  const indicatorH = useRef(new Animated.Value(0)).current;
  const hasPlacedRef = useRef(false);

  /** Record a tab row's position within the stack. */
  const recordRow = useCallback((index: number, y: number, height: number) => {
    const prev = layouts.current[index];
    // Ignore no-op re-measures so an in-flight animation isn't restarted.
    if (prev && prev.y === y && prev.height === height) return;
    layouts.current[index] = { y, height };
  }, []);

  /** Move the indicator onto row `index`. */
  const moveTo = useCallback(
    (index: number, animate: boolean) => {
      const row = layouts.current[index];
      if (!row) return;

      if (reduceMotion || !animate) {
        indicatorY.setValue(row.y);
        indicatorH.setValue(row.height);
        return;
      }

      Animated.parallel([
        Animated.spring(indicatorY, {
          ...NAV_INDICATOR_SPRING,
          toValue: row.y,
          useNativeDriver: false,
        }),
        Animated.spring(indicatorH, {
          ...NAV_INDICATOR_SPRING,
          toValue: row.height,
          useNativeDriver: false,
        }),
      ]).start();
    },
    [indicatorY, indicatorH, reduceMotion]
  );

  /**
   * Syncs the indicator to `index`. Safe to call before layout has landed — it
   * simply does nothing until the row is measured, and the next effect run
   * picks it up.
   */
  const syncTo = useCallback(
    (index: number) => {
      if (index < 0 || index >= count) return;
      if (layouts.current[index] === undefined) return;
      moveTo(index, hasPlacedRef.current);
      hasPlacedRef.current = true;
    },
    [count, moveTo]
  );

  /** Clears cached measurements — call when the row geometry itself changes. */
  const invalidate = useCallback(() => {
    layouts.current = {};
    hasPlacedRef.current = false;
  }, []);

  /** Animated style for the indicator view, or null under reduced motion. */
  const indicatorStyle = reduceMotion
    ? null
    : { top: indicatorY, height: indicatorH };

  return { recordRow, syncTo, invalidate, indicatorStyle, reduceMotion };
}

export const INDICATOR_RADIUS = radius.lg;
