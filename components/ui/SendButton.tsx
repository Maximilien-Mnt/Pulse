// ---------------------------------------------------------------------------
// PULSE DESIGN SYSTEM — SendButton
//
// The single canonical send control for every composer in the app
// (DMs, post comments, comment modals, profile post sheets, …).
// 44x44 circle, primary surface, white FILLED paper-plane at 22px.
//
// Motion language (same as <IconButton>, the canonical reference):
//   - Hover (web) / focus (every platform): surface LIFTS to the exact
//     pressed colour over a 150ms `transition-colors` fade (JS `hovered`
//     state + class swap, never Tailwind `hover:`), container springs to
//     1.06 and the glyph grows in place to 1.18 via shared <HoverGlyph>.
//   - Press: container squashes to 0.9 via <PressableScale> spring +
//     `active:` surface tint.
//   - Send (the send-specific signature): the glyph launches 10px up-right
//     while fading out (120ms, ease-in), then springs back from the
//     opposite offset (180ms, ease-out) — the paper-plane metaphor. Runs
//     on a dedicated outer Animated.View so it composes with (never
//     fights) the press squash and the hover grow.
// All of it snaps under `useReducedMotion`.
// ---------------------------------------------------------------------------

import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Easing, Platform, type PressableProps } from "react-native";

import { Icon } from "./Icon";
import { HoverGlyph } from "./HoverGlyph";
import { PressableScale } from "./PressableScale";
import {
  BUTTON_ICON_SIZE,
  ICON_BUTTON_SCALE_HOVER,
  ICON_BUTTON_SCALE_PRESS,
} from "./IconButton";
import { hitSlopForIcon } from "@/src/accessibility";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/utils/format";

/** Glyph scale while hovered / keyboard-focused — grows in place, stays centered.
 * Kept in sync with HoverGlyph / IconButton (1.18). Deprecated: prefer the
 * shared <HoverGlyph> wrapper; kept exported for backward-compat imports. */
export const SEND_BUTTON_GLYPH_SCALE = 1.18;
/** Launch travel (px) of the glyph on send, up-right. */
export const SEND_BUTTON_LAUNCH = 10;
/** Duration (ms) of the launch-out fade. */
export const SEND_BUTTON_LAUNCH_OUT_MS = 120;
/** Duration (ms) of the glyph spring-back. */
export const SEND_BUTTON_LAUNCH_BACK_MS = 180;
/** Filled paper-plane size inside the 44px circle. */
export const SEND_BUTTON_ICON_SIZE = 22;

export interface SendButtonProps extends Omit<PressableProps, "children" | "style"> {
  /** Required accessible name — an icon-only button has no visible text. */
  label: string;
  /** Optional hint describing what activating it does. */
  hint?: string;
  onPress?: () => void;
  disabled?: boolean;
  /** When true the glyph is replaced by a white spinner. */
  loading?: boolean;
  /** Extra classes merged last — use for positioning, not for colour. */
  className?: string;
  /** Test identifier for E2E and unit tests. */
  testID?: string;
}

export function SendButton({
  label,
  hint,
  onPress,
  disabled = false,
  loading = false,
  className,
  testID,
  onFocus,
  onBlur,
  ...rest
}: SendButtonProps) {
  const reduceMotion = useReducedMotion();
  const [hovered, setHovered] = useState(false);
  const hoveredRef = useRef(false);
  const nudgeX = useRef(new Animated.Value(0)).current;
  const nudgeY = useRef(new Animated.Value(0)).current;
  const launchOpacity = useRef(new Animated.Value(1)).current;
  const launchingRef = useRef(false);
  const inactive = disabled || loading;

  const setTo = useCallback(
    (next: boolean) => {
      const value = !inactive && next;
      if (hoveredRef.current === value) return;
      hoveredRef.current = value;
      setHovered(value);
    },
    [inactive]
  );

  useEffect(() => {
    if (inactive && hoveredRef.current) {
      hoveredRef.current = false;
      setHovered(false);
    }
  }, [inactive]);

  // Hover grow is owned by shared <HoverGlyph> below (same 1.18 / 150ms
  // as every circular button) — no bespoke glyph timing here.

  const handlePress = useCallback(() => {
    if (inactive) return;
    if (!reduceMotion) {
      launchingRef.current = true;
      Animated.parallel([
        Animated.timing(nudgeX, {
          toValue: SEND_BUTTON_LAUNCH,
          duration: SEND_BUTTON_LAUNCH_OUT_MS,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(nudgeY, {
          toValue: -SEND_BUTTON_LAUNCH,
          duration: SEND_BUTTON_LAUNCH_OUT_MS,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(launchOpacity, {
          toValue: 0,
          duration: SEND_BUTTON_LAUNCH_OUT_MS,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Park just behind the origin so the return leg visibly travels.
        nudgeX.setValue(-SEND_BUTTON_LAUNCH / 2);
        nudgeY.setValue(SEND_BUTTON_LAUNCH / 2);
        Animated.parallel([
          Animated.timing(nudgeX, {
            toValue: 0,
            duration: SEND_BUTTON_LAUNCH_BACK_MS,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(nudgeY, {
            toValue: 0,
            duration: SEND_BUTTON_LAUNCH_BACK_MS,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(launchOpacity, {
            toValue: 1,
            duration: SEND_BUTTON_LAUNCH_BACK_MS,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
        ]).start(() => {
          launchingRef.current = false;
        });
      });
    }
    onPress?.();
  }, [inactive, reduceMotion, nudgeX, nudgeY, launchOpacity, onPress]);

  const isWeb = Platform.OS === "web";
  const containerClass = cn(
    "rounded-full items-center justify-center shrink-0",
    "w-11 h-11",
    "bg-primary dark:bg-primary-dark",
    hovered && "bg-primary-hover dark:bg-primary-hover-dark",
    !inactive && "active:bg-primary-hover dark:active:bg-primary-hover-dark",
    !reduceMotion && "transition-colors",
    // Literal duration — must stay statically extractable for NativeWind
    // (same 150ms as ICON_BUTTON_TRANSITION_MS, the shared motion token).
    "duration-150",
    inactive && "opacity-50",
    className
  );

  return (
    <PressableScale
      {...rest}
      onPress={handlePress}
      disabled={inactive}
      scaleOnPress={ICON_BUTTON_SCALE_PRESS}
      scaleOnHover={ICON_BUTTON_SCALE_HOVER}
      onHoverIn={isWeb ? setTo.bind(null, true) : undefined}
      onHoverOut={isWeb ? setTo.bind(null, false) : undefined}
      onFocus={(e) => {
        setTo(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setTo(false);
        onBlur?.(e);
      }}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      hitSlop={hitSlopForIcon(BUTTON_ICON_SIZE)}
      className={containerClass}
    >
      {loading ? (
        <ActivityIndicator color="#FFFFFF" size="small" />
      ) : (
        <Animated.View
          testID={testID ? `${testID}-launch` : undefined}
          style={{
            transform: [
              { translateX: nudgeX },
              { translateY: nudgeY },
            ],
            opacity: launchOpacity,
          }}
        >
          <HoverGlyph
            active={hovered}
            testID={testID ? `${testID}-glyph` : undefined}
          >
            <Icon name="Send" size={SEND_BUTTON_ICON_SIZE} color="white" filled decorative />
          </HoverGlyph>
        </Animated.View>
      )}
    </PressableScale>
  );
}

