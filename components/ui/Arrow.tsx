// ---------------------------------------------------------------------------
// PULSE DESIGN SYSTEM — Arrow
//
// The one way to render an interactive directional arrow (chevron / arrow)
// inside a button or link. Every arrow control renders through <Arrow> so the
// glyph, stroke and micro-interaction are identical everywhere (size and
// color may still vary per context):
//   - glyph: Lucide through the design-system <Icon> (strokeWidth 1.75,
//     semantic color token) — never a bespoke SVG,
//   - micro-interaction: on web hover / keyboard focus of the owning
//     pressable the arrow nudges 4px along its own axis (150ms, ease-out)
//     and slides back on hover-out / blur — the pattern from the profile
//     screen's notification/settings link cards. Left/right chevrons nudge
//     sideways, up/down disclosure chevrons nudge vertically.
//
// Usage:
//   const { active, ...nudge } = useArrowNudge();
//   <Pressable {...nudge} onPress={open}>
//     …content…
//     <Arrow active={active} name="ChevronRight" size={16} color="text-tertiary" />
//   </Pressable>
//
// The nudge never fires while the pressable is `disabled`, and it snaps
// without animation when the user prefers reduced motion.
// ---------------------------------------------------------------------------

import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Platform } from "react-native";
import { Icon, type IconColor, type IconName } from "./Icon";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/** Travel (px) of an arrow on hover/focus, along its own axis — the reference nudge. */
export const ARROW_NUDGE = 4;
/** Duration (ms) of the nudge in and back out. */
export const ARROW_NUDGE_DURATION = 150;

/** Unit vector an icon nudges along (0 on an axis = no motion on that axis). */
export type ArrowVector = { x: -1 | 0 | 1; y: -1 | 0 | 1 };

/**
 * Directional icons and the way they nudge. Left/right cover navigation
 * affordances (links, back buttons, carousel arrows), up/down cover the
 * disclosure chevrons that flip when a section expands/collapses. Keyed by
 * the design-system icon set, so this map is the complete list.
 */
const ARROW_DIRECTIONS: Partial<Record<IconName, ArrowVector>> = {
  ChevronLeft: { x: -1, y: 0 },
  ArrowLeft: { x: -1, y: 0 },
  ChevronRight: { x: 1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  ChevronDown: { x: 0, y: 1 },
  ChevronUp: { x: 0, y: -1 },
};

/** True when the icon is a directional arrow (chevron / arrow) that can nudge. */
export function isArrowIcon(name: IconName): boolean {
  return name in ARROW_DIRECTIONS;
}

/**
 * Nudge vector of an icon; { 0, 0 } for non-directional icons. The single
 * source of truth for which way an arrow travels (used by <Arrow> and by
 * tests, so a screen can never hand-roll its own offset).
 */
export function arrowNudgeVector(name: IconName): ArrowVector {
  return ARROW_DIRECTIONS[name] ?? { x: 0, y: 0 };
}

// ---------------------------------------------------------------------------
// useArrowNudge — hover/focus state for the pressable that owns an <Arrow>
// ---------------------------------------------------------------------------

export interface ArrowNudgeOptions {
  /** When true, hover/focus never activates the nudge (disabled pressables). */
  disabled?: boolean;
}

export interface ArrowNudgeHandlers {
  /** True while the owning pressable is hovered (web) or keyboard-focused. */
  active: boolean;
  onHoverIn?: () => void;
  onHoverOut?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
}

/**
 * Drives the shared arrow nudge. Spread the handlers (everything except
 * `active`) on the owning Pressable / PressableScale and pass `active` to
 * the <Arrow> inside it.
 */
export function useArrowNudge({
  disabled = false,
}: ArrowNudgeOptions = {}): ArrowNudgeHandlers {
  const [active, setActive] = useState(false);
  const activeRef = useRef(false);

  const setTo = (next: boolean) => {
    const value = !disabled && next;
    if (activeRef.current === value) return;
    activeRef.current = value;
    setActive(value);
  };

  // A pressable that becomes disabled while hovered/focused releases the nudge.
  useEffect(() => {
    if (disabled && activeRef.current) {
      activeRef.current = false;
      setActive(false);
    }
  }, [disabled]);

  // Hover is a pointer concept — web only, like the reference implementation.
  // Focus/blur (keyboard) is not platform-gated: it is the keyboard affordance
  // for the same animation.
  const isWeb = Platform.OS === "web";

  return {
    active,
    onHoverIn: isWeb ? () => setTo(true) : undefined,
    onHoverOut: isWeb ? () => setTo(false) : undefined,
    onFocus: () => setTo(true),
    onBlur: () => setTo(false),
  };
}

// ---------------------------------------------------------------------------
// Arrow — the animated arrow itself
// ---------------------------------------------------------------------------

export interface ArrowProps {
  /** Icon name. Only horizontal arrows (Chevron/Arrow ←→) animate. */
  name: IconName;
  /** Hover/focus state from useArrowNudge. Default false. */
  active?: boolean;
  /** Size in pixels. Default 24. */
  size?: number;
  /** Semantic color token (or raw hex). Default "text-secondary". */
  color?: IconColor;
  /** Fills the glyph with the effective color (rarely needed on arrows). */
  filled?: boolean;
  /** Optional NativeWind class names forwarded to the underlying icon. */
  className?: string;
  /** Test identifier for E2E and unit tests. */
  testID?: string;
  /** Informative label (arrows are decorative by default). */
  accessibilityLabel?: string;
  accessibilityHint?: string;
  /** Explicitly mark the arrow as decorative (ignored by AT). */
  decorative?: boolean;
}

export function Arrow({
  active = false,
  name,
  size = 24,
  color = "text-secondary",
  filled,
  className,
  testID,
  accessibilityLabel,
  accessibilityHint,
  decorative,
}: ArrowProps) {
  const reduceMotion = useReducedMotion();
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const vector = arrowNudgeVector(name);
  const { x, y } = vector;

  useEffect(() => {
    const moves = [
      { value: translateX, to: active ? x * ARROW_NUDGE : 0 },
      { value: translateY, to: active ? y * ARROW_NUDGE : 0 },
    ];
    for (const { value, to } of moves) {
      if (reduceMotion) {
        // Still move, just without the animation (reduced-motion UX).
        value.setValue(to);
        continue;
      }
      Animated.timing(value, {
        toValue: to,
        duration: ARROW_NUDGE_DURATION,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    }
  }, [active, x, y, reduceMotion, translateX, translateY]);

  return (
    <Animated.View style={{ transform: [{ translateX }, { translateY }] }}>
      <Icon
        name={name}
        size={size}
        color={color}
        filled={filled}
        className={className}
        testID={testID}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        decorative={decorative}
      />
    </Animated.View>
  );
}
