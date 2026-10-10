// ---------------------------------------------------------------------------
// PULSE DESIGN SYSTEM — PressableScale
//
// A Pressable with built-in micro-interactions, used across detail pages for
// a consistent, playful yet subtle feel:
//   - Press: scales down briefly (tactile feedback on click/tap).
//   - Hover (web only): scales up slightly (elements "grow" under the cursor).
//   - Both are springs, both respect `prefers-reduced-motion`.
//
// Usage:
//   <PressableScale onPress={open} scaleOnHover={1.06} scaleOnPress={0.94}>
//     ...content...
//   </PressableScale>
//
// A `hoverOnly` variant is handy for images/avatars that should zoom on
// hover but have no click action of their own.
// ---------------------------------------------------------------------------

import { useRef } from "react";
import { Animated, Pressable, Platform } from "react-native";
import type { PressableProps } from "react-native";

import { useReducedMotion } from "@/hooks/useReducedMotion";
import type { AccessibilityHintProps } from "@/src/accessibility";

// ---------------------------------------------------------------------------
// Chip motion constants — shared by every carousel tag/filter/sort pill so the
// micro-interaction is identical across Feed, Conversations and the sort/filter
// panels. Chips are larger text pills than icon buttons, so the scale deltas are
// gentler than ICON_BUTTON_SCALE_HOVER/PRESS (a big squash reads as text wobble).
// ---------------------------------------------------------------------------

/** Scale applied while hovered (web) / keyboard-focused. */
export const CHIP_SCALE_HOVER = 1.04;
/** Scale applied while pressed (click/tap). */
export const CHIP_SCALE_PRESS = 0.96;



export interface PressableScaleProps extends PressableProps, AccessibilityHintProps {
  /** Scale applied while pressed. Default 0.94. */
  scaleOnPress?: number;
  /** Scale applied while hovered (web). Default 1 (no hover effect). */
  scaleOnHover?: number;
  /**
   * When true the press effect is skipped (pure hover element, e.g. a logo).
   * Press handlers still work.
   */
  hoverOnly?: boolean;
}

export function PressableScale({
  scaleOnPress = 0.94,
  scaleOnHover = 1,
  hoverOnly = false,
  onPressIn,
  onPressOut,
  onHoverIn,
  onHoverOut,
  onFocus,
  onBlur,
  style,
  children,
  ...rest
}: PressableScaleProps) {
  const reduceMotion = useReducedMotion();
  const scale = useRef(new Animated.Value(1)).current;
  const hoveredRef = useRef(false);

  const springTo = (value: number) => {
    if (reduceMotion) {
      scale.setValue(1);
      return;
    }
    Animated.spring(scale, {
      toValue: value,
      friction: 6,
      tension: 300,
      useNativeDriver: true,
    }).start();
  };

  const isWeb = Platform.OS === "web";

  return (
    <Pressable
      {...rest}
      onHoverIn={
        isWeb
          ? (e) => {
              hoveredRef.current = true;
              if (scaleOnHover !== 1) springTo(scaleOnHover);
              onHoverIn?.(e);
            }
          : onHoverIn
      }
      onHoverOut={
        isWeb
          ? (e) => {
              hoveredRef.current = false;
              if (scaleOnHover !== 1) springTo(1);
              onHoverOut?.(e);
            }
          : onHoverOut
      }
      onPressIn={
        hoverOnly
          ? onPressIn
          : (e) => {
              springTo(scaleOnPress);
              onPressIn?.(e);
            }
      }
      onPressOut={
        hoverOnly
          ? onPressOut
          : (e) => {
              springTo(hoveredRef.current && scaleOnHover !== 1 ? scaleOnHover : 1);
              onPressOut?.(e);
            }
      }
      // Keyboard focus gets the same lift as pointer hover so the affordance
      // is never mouse-only. Not platform-gated (unlike hover above) because
      // focus is the keyboard affordance on native as well as web. Only wired
      // when the caller actually asked for a hover effect, so the many
      // `scaleOnHover === 1` usages keep their plain press-squash behaviour.
      onFocus={
        scaleOnHover !== 1
          ? (e) => {
              hoveredRef.current = true;
              springTo(scaleOnHover);
              onFocus?.(e);
            }
          : onFocus
      }
      onBlur={
        scaleOnHover !== 1
          ? (e) => {
              hoveredRef.current = false;
              springTo(1);
              onBlur?.(e);
            }
          : onBlur
      }
      style={[{ transform: [{ scale }] }, style as never]}
    >
      {children}
    </Pressable>
  );
}
