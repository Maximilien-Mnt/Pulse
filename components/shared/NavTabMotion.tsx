// ---------------------------------------------------------------------------
// PULSE DESIGN SYSTEM — Nav Tab Motion
//
// Shared micro-interaction + active-indicator behaviour for the app's two
// navigation bars (SideRail — vertical, web ≥768px; TabBar — bottom, mobile).
// Both render their tabs through <NavTab> so a tab feels identical everywhere,
// and both get the sliding active background from the axis-aware
// `useSlidingIndicator` — the rail travels vertically, the bottom bar
// horizontally, off the same spring.
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
// The active indicator animates its position between measured tab rects, which
// means `useNativeDriver: false` — neither `top` nor `left` is a native-driver
// property. That is acceptable here: it is a single 4-item list, animating only
// while the selected tab changes.
// ---------------------------------------------------------------------------

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Animated, Platform, StyleSheet, View } from "react-native";
import type { PressableProps } from "react-native";

import { Icon, type IconColor, type IconName } from "@/components/ui/Icon";
import {
  ICON_BUTTON_SCALE_HOVER,
  ICON_BUTTON_SCALE_PRESS,
  ICON_BUTTON_TRANSITION_MS,
} from "@/components/ui/IconButton";
import { PressableScale } from "@/components/ui/PressableScale";
import { Text, type TextVariant } from "@/components/ui/Text";
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
 * Horizontal inset of the vertical rail's sliding indicator, matching the
 * `px-3` (12px) padding of the tab stack it is rendered into.
 */
export const INDICATOR_INSET = spacing[3];

/** Corner radius of the sliding indicator — matches the tab rows' `rounded-lg`. */
export const INDICATOR_RADIUS = radius.lg;

// ---------------------------------------------------------------------------
// Metrics — one rhythm shared by both bars
//
// Resolved from the design tokens (not magic numbers) so the vertical rail and
// the horizontal bar can never drift apart. Both bars lay their rows out as
// `py-[NAV_TAB_ROW_PADDING_Y]` around a 24px icon, which makes a row 48px tall:
// comfortably above the 44px minimum tap target on both axes.
// ---------------------------------------------------------------------------

/**
 * Vertical padding of a nav tab row. 12px either side of a 24px icon gives a
 * 48px row — above the 44px minimum tap target, and identical in both bars.
 */
export const NAV_TAB_ROW_PADDING_Y = spacing[3];
/** Size of the icon inside a nav tab, for both bars. */
export const NAV_TAB_ICON_SIZE = 24;
/** Gap between the icon and its label inside an expanded (vertical) row. */
export const NAV_TAB_LABEL_GAP = spacing[3];
/** Gap between stacked nav tab rows in the vertical rail. */
export const NAV_TAB_STACK_GAP = spacing[3];

/**
 * Scale applied to a tab's icon on hover/focus. Slightly stronger than
 * ICON_BUTTON_SCALE_HOVER (1.06) because the icon here is the *label* of the
 * control rather than the control itself — it needs to carry the "this is
 * clickable" signal on its own while the row surface barely changes.
 */
export const NAV_TAB_ICON_SCALE_HOVER = 1.12;

/**
 * Height of the horizontal bar's sliding indicator. The bar is 64px tall; the
 * pill is deliberately much taller than a 24px icon so the active state reads
 * as a capsule behind the whole tab rather than a square behind a glyph.
 */
export const TAB_BAR_INDICATOR_HEIGHT = 48;
/** Vertical margin kept between the horizontal pill and the bar's edges. */
export const TAB_BAR_INDICATOR_INSET_Y = (64 - TAB_BAR_INDICATOR_HEIGHT) / 2;

// ---------------------------------------------------------------------------
// NavTab hover context
//
// The row already knows whether it is hovered or selected; its icon and label
// need that same signal to run their own micro-animation. Publishing it through
// context avoids re-plumbing handlers into every child and guarantees the icon,
// the label and the row surface can never disagree about the current state —
// the class of bug that makes a navbar feel "off" without being obviously wrong.
// ---------------------------------------------------------------------------

interface NavTabHoverValue {
  hovered: boolean;
  active: boolean;
}

const NavTabHoverContext = createContext<NavTabHoverValue>({ hovered: false, active: false });

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
    <NavTabHoverContext.Provider value={{ hovered, active }}>
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
    </NavTabHoverContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// NavTabIcon / NavTabLabel
// ---------------------------------------------------------------------------

export interface NavTabIconProps {
  /** Icon from the Pulse icon set. */
  name: IconName;
  /** Overrides the shared 24px size. */
  size?: number;
  /** Overrides the active/inactive colour pair (blue ↔ tertiary). */
  activeColor?: IconColor;
  inactiveColor?: IconColor;
  testID?: string;
}

/**
 * The icon inside a nav tab. Reads the row's hover/active state from context
 * and runs a small spring scale-up on hover or keyboard focus, so the icon
 * itself acknowledges the pointer rather than only the row surface behind it.
 *
 * Colour follows the shared hierarchy: blue when selected (or hovered, as a
 * preview of where the selection will land), tertiary at rest.
 *
 * Under `prefers-reduced-motion` the scale is pinned to 1 — the colour change
 * still happens, so the tab is never mute.
 */
export function NavTabIcon({
  name,
  size = NAV_TAB_ICON_SIZE,
  activeColor = "primary",
  inactiveColor = "text-tertiary",
  testID,
}: NavTabIconProps) {
  const { hovered, active } = useContext(NavTabHoverContext);
  const reduceMotion = useReducedMotion();
  const scale = useRef(new Animated.Value(1)).current;
  const engaged = hovered || active;

  useEffect(() => {
    if (reduceMotion) {
      scale.setValue(1);
      return;
    }
    Animated.spring(scale, {
      toValue: engaged ? NAV_TAB_ICON_SCALE_HOVER : 1,
      friction: 6,
      tension: 300,
      useNativeDriver: true,
    }).start();
  }, [engaged, reduceMotion, scale]);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Icon
        name={name}
        size={size}
        color={engaged ? activeColor : inactiveColor}
        testID={testID}
      />
    </Animated.View>
  );
}

export interface NavTabLabelProps {
  /** Visible tab name. */
  label: string;
  /** Typography variant. Defaults to `buttonLabel`, as in the rail today. */
  variant?: TextVariant;
  className?: string;
  testID?: string;
}

/**
 * The text label inside an expanded nav tab. Fades between the tertiary and
 * blue tokens over the shared 150ms colour transition, matching how IconButton
 * and the row surface animate — no spring, because a label scaling would look
 * like a bug rather than an affordance.
 */
export function NavTabLabel({
  label,
  variant = "buttonLabel",
  className,
  testID,
}: NavTabLabelProps) {
  const { hovered, active } = useContext(NavTabHoverContext);
  const engaged = hovered || active;

  return (
    <Text
      variant={variant}
      testID={testID}
      className={cn(
        "transition-colors",
        `duration-${ICON_BUTTON_TRANSITION_MS}`,
        engaged ? "text-primary" : "text-tertiary",
        className
      )}
    >
      {label}
    </Text>
  );
}

// ---------------------------------------------------------------------------
// useSlidingIndicator
// ---------------------------------------------------------------------------

/** Layout of one measured tab, along whichever axis its bar stacks on. */
interface TabRowLayout {
  /** Offset along the bar's axis: `y` for vertical, `x` for horizontal. */
  offset: number;
  /** Size along the bar's axis: row height, or column width. */
  size: number;
}

/** Which way the bar lays its tabs out, and so which way the indicator travels. */
export type NavIndicatorAxis = "vertical" | "horizontal";

/**
 * Drives the sliding active background for a tab bar, along either axis.
 *
 * Each tab reports its own `onLayout`; this hook keeps the most recent
 * measurements and animates a single indicator to the selected tab. Sizes can
 * differ between tabs (and change at a breakpoint, or when the Create FAB
 * splits the horizontal bar), so the indicator animates its own size rather
 * than assuming a fixed one.
 *
 * The very first placement SNAPS into position instead of springing —
 * otherwise the tint would be seen flying in from offset 0 on mount.
 * Subsequent moves spring, including a collapse ↔ expand at the 1024px
 * breakpoint, which re-measures every tab.
 */
export function useSlidingIndicator(
  count: number,
  axis: NavIndicatorAxis = "vertical"
) {
  const reduceMotion = useReducedMotion();
  const isVertical = axis === "vertical";
  const layouts = useRef<Record<number, TabRowLayout>>({});
  const indicatorPos = useRef(new Animated.Value(0)).current;
  const indicatorSize = useRef(new Animated.Value(0)).current;
  const hasPlacedRef = useRef(false);

  /**
   * Record a tab's position within the bar. Callers read the matching field
   * off the layout event for their axis: `y`/`height` for the vertical rail,
   * `x`/`width` for the bottom bar.
   */
  const recordRow = useCallback((index: number, offset: number, size: number) => {
    const prev = layouts.current[index];
    // Ignore no-op re-measures so an in-flight animation isn't restarted.
    if (prev && prev.offset === offset && prev.size === size) return;
    layouts.current[index] = { offset, size };
  }, []);

  /** Move the indicator onto tab `index`. */
  const moveTo = useCallback(
    (index: number, animate: boolean) => {
      const row = layouts.current[index];
      if (!row) return;

      if (reduceMotion || !animate) {
        indicatorPos.setValue(row.offset);
        indicatorSize.setValue(row.size);
        return;
      }

      Animated.parallel([
        Animated.spring(indicatorPos, {
          ...NAV_INDICATOR_SPRING,
          toValue: row.offset,
          useNativeDriver: false,
        }),
        Animated.spring(indicatorSize, {
          ...NAV_INDICATOR_SPRING,
          toValue: row.size,
          useNativeDriver: false,
        }),
      ]).start();
    },
    [indicatorPos, indicatorSize, reduceMotion]
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

  /**
   * Animated style for the indicator view, or null under reduced motion.
   * `top`/`height` on the vertical rail, `left`/`width` on the bottom bar — the
   * consumer pairs it with `position: absolute` and the static insets.
   */
  const indicatorStyle = reduceMotion
    ? null
    : isVertical
      ? { top: indicatorPos, height: indicatorSize }
      : { left: indicatorPos, width: indicatorSize };

  return { recordRow, syncTo, invalidate, indicatorStyle, reduceMotion };
}
