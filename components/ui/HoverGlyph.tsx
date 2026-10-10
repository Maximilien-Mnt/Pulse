// ---------------------------------------------------------------------------
// PULSE DESIGN SYSTEM — HoverGlyph
//
// Wraps a button glyph so it grows in place on hover/focus, alongside the
// surface lift. Shared by every default circular button (IconButton,
// BackButton, GalleryArrowButton, EventMembersStrip see-all,
// CoverOverlayActions chips): background colour changes AND the icon gets a
// little bit bigger.
//
// Uses the same scale (1.18) + duration (150ms) as SendButton's glyph
// and snaps under reduced motion. Driven by the owner's existing
// hover/focus boolean so it stays mouse+keyboard parity (never a CSS-only
// `hover:` variant).
// ---------------------------------------------------------------------------

import React, { useEffect, useRef } from "react";
import { Animated, Easing } from "react-native";

import { useReducedMotion } from "@/hooks/useReducedMotion";

/** Glyph scale while hovered / keyboard-focused. Mirrors SendButton's glyph. */
const HOVER_GLYPH_SCALE = 1.18;
/** Duration (ms) of the grow, matching the surface colour fade. */
const HOVER_GLYPH_DURATION_MS = 150;

export function HoverGlyph({
  active,
  children,
  testID,
}: {
  /** True while the owning pressable is hovered (web) or focused. */
  active: boolean;
  children: React.ReactNode;
  testID?: string;
}) {
  const reduceMotion = useReducedMotion();
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const to = active ? HOVER_GLYPH_SCALE : 1;
    if (reduceMotion) {
      scale.setValue(to);
      return;
    }
    Animated.timing(scale, {
      toValue: to,
      duration: HOVER_GLYPH_DURATION_MS,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [active, reduceMotion, scale]);

  return (
    <Animated.View testID={testID} style={{ transform: [{ scale }] }}>
      {children}
    </Animated.View>
  );
}
