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

export interface PressableScaleProps extends PressableProps {
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
      style={[{ transform: [{ scale }] }, style as never]}
    >
      {children}
    </Pressable>
  );
}
