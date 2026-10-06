// ---------------------------------------------------------------------------
// PULSE DESIGN SYSTEM — SearchBar (shared)
//
// Single search pill used in feed / explore / conversations.
// Motion (coherent with IconButton / Button / Arrow — 150ms fades, spring
// scale, glyph nudge, all gated by useReducedMotion):
//   - Bar hover (web) / focus ("lit"): surface lifts neutral-100 → neutral-200
//     (dark: 800 → 700), the search glyph tints to primary and slides
//     SEARCH_BAR_GLYPH_NUDGE px right, the bar scales to
//     SEARCH_BAR_SCALE_HOVER (spring on the collapsed stub, 150ms CSS fade on
//     the expanded bar), and a soft primary halo fades in around the pill
//     (web). Still no border, no outline — the halo is a brand glow, never a
//     dark focus ring.
//   - Transient vs persistent: `lit` (hover || focus) drives the glow / scale
//     / glyph slide; `engaged` (lit || a filled query) keeps the lifted
//     surface, so a filled bar stays readable after blur without staying lit.
//   - Bar press (collapsed stub): gentle squash to 0.98.
//   - Clear button: circular chip with its own hover (chip darkens +
//     icon tints to primary, surface lifts to 1.06) and press (squash
//     to 0.9). Plain "X" glyph — never XCircle+filled (which self-fills
//     into an unreadable blob).
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Easing, Platform, Text, TextInput, View } from "react-native";
import { Icon } from "@/components/ui/Icon";
import { PressableScale } from "@/components/ui/PressableScale";
import {
  ICON_BUTTON_SCALE_HOVER,
  ICON_BUTTON_SCALE_PRESS,
} from "@/components/ui/IconButton";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useDesignTokens } from "@/src/design-tokens/useDesignTokens";
import { cn } from "@/utils/format";
import { t } from "@/hooks/useTranslation";

type Props = {
  value: string;
  onChangeText: (t: string) => void;
  onClear?: () => void;
  onCollapse?: () => void;
  placeholder?: string;
  onPress?: () => void;
  expanded?: boolean;
  onSubmitEditing?: () => void;
  autoFocus?: boolean;
  className?: string;
};

/**
 * Hover/focus lift for a full-width bar — bolder than the previous 1.02,
 * still calmer than the 1.06 icon-button lift.
 */
export const SEARCH_BAR_SCALE_HOVER = 1.04;
/** Press squash for a full-width bar — calmer than 0.9 icon-button press. */
export const SEARCH_BAR_SCALE_PRESS = 0.98;
/** Colour-fade duration shared with IconButton / Button. */
export const SEARCH_BAR_TRANSITION_MS = 150;
/** Travel (px) of the search glyph on hover/focus — the field "opens up". */
export const SEARCH_BAR_GLYPH_NUDGE = 5;
/** Alpha of the soft primary halo drawn around an engaged bar (web). */
export const SEARCH_BAR_GLOW_ALPHA = 0.45;

const restSurface = "bg-neutral-100 dark:bg-neutral-800";
const liftedSurface = "bg-neutral-200 dark:bg-neutral-700";

const clearRest = "bg-neutral-300/60 dark:bg-neutral-600/60";
const clearLifted = "bg-neutral-400/80 dark:bg-neutral-500/80";

/**
 * "#3358FF" + 0.45 → "rgba(51,88,255,0.45)" — the halo colour is derived from
 * the active theme's primary token so it tracks light/dark automatically.
 */
function withAlpha(hex: string, alpha: number): string {
  const normalized = hex.replace("#", "");
  const full =
    normalized.length === 3
      ? normalized
          .split("")
          .map((c) => c + c)
          .join("")
      : normalized;
  const value = Number.parseInt(full, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

// ---------------------------------------------------------------------------
// Search glyph — tints with the bar state and slides right while the bar is
// lit, so hover/focus reads as the field "opening up". Same nudge language as
// <Arrow> (150ms ease-out, snaps under reduced motion).
// ---------------------------------------------------------------------------

function SearchGlyph({
  lit,
  engaged,
  reduceMotion,
}: {
  /** Hover (web) or keyboard focus — drives the slide. */
  lit: boolean;
  /** Also true while a query is present — drives the tint only. */
  engaged: boolean;
  reduceMotion: boolean;
}) {
  const translateX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const to = lit ? SEARCH_BAR_GLYPH_NUDGE : 0;
    if (reduceMotion) {
      // Still move, just without the animation (reduced-motion UX).
      translateX.setValue(to);
      return;
    }
    Animated.timing(translateX, {
      toValue: to,
      duration: SEARCH_BAR_TRANSITION_MS,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [lit, reduceMotion, translateX]);

  return (
    <Animated.View style={{ transform: [{ translateX }] }}>
      <Icon name="Search" size={18} color={engaged ? "primary" : "text-tertiary"} />
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Glow — soft primary halo around an engaged bar (web only: native has no
// pointer hover, and a string boxShadow is a DOM affordance). Lives on its own
// overlay so its opacity fade (`transition-opacity`) never shares a
// transition-property class with the pill's colour swap, and it paints below
// the glyph/text because it is the pill's first child.
// ---------------------------------------------------------------------------

function GlowOverlay({
  lit,
  color,
  reduceMotion,
}: {
  /** True while the bar is hovered (web) or keyboard-focused. */
  lit: boolean;
  /** Current-mode primary token — the halo follows light/dark with it. */
  color: string;
  reduceMotion: boolean;
}) {
  return (
    <View
      pointerEvents="none"
      testID="search-bar-glow"
      className={cn(
        "absolute top-0 left-0 right-0 bottom-0 rounded-full",
        lit ? "opacity-100" : "opacity-0",
        !reduceMotion && "transition-opacity duration-150"
      )}
      style={{
        // Diffuse brand halo + a hair of elevation — a glow, never a ring.
        boxShadow: `0 0 14px 3px ${withAlpha(color, SEARCH_BAR_GLOW_ALPHA)}, 0 2px 8px rgba(0,0,0,0.10)`,
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Clear (cross) button — circular chip with hover + press micro-interaction
// ---------------------------------------------------------------------------

function ClearButton({ onPress }: { onPress: () => void }) {
  const reduceMotion = useReducedMotion();
  const [hovered, setHovered] = useState(false);
  const isWeb = Platform.OS === "web";

  const setTo = useCallback(
    (next: boolean) => setHovered(reduceMotion ? false : next),
    [reduceMotion]
  );

  return (
    <PressableScale
      onPress={onPress}
      scaleOnPress={reduceMotion ? 1 : ICON_BUTTON_SCALE_PRESS}
      scaleOnHover={reduceMotion ? 1 : ICON_BUTTON_SCALE_HOVER}
      hitSlop={10}
      accessible
      accessibilityRole="button"
      accessibilityLabel={t("common.close")}
      accessibilityHint={t("common.close")}
      onHoverIn={isWeb ? () => setTo(true) : undefined}
      onHoverOut={isWeb ? () => setTo(false) : undefined}
      onFocus={() => setTo(true)}
      onBlur={() => setTo(false)}
      className={cn(
        "w-6 h-6 rounded-full items-center justify-center shrink-0",
        hovered ? clearLifted : clearRest,
        !reduceMotion && "transition-colors duration-150"
      )}
    >
      <Icon
        name="X"
        size={14}
        color={hovered ? "primary" : "text-secondary"}
      />
    </PressableScale>
  );
}

export function SearchBar({
  value,
  onChangeText,
  onClear,
  onCollapse,
  placeholder = t("common.search"),
  onPress,
  expanded,
  onSubmitEditing,
  autoFocus = true,
  className,
}: Props) {
  const reduceMotion = useReducedMotion();
  const tokens = useDesignTokens();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const isWeb = Platform.OS === "web";

  const hasQuery = value.trim().length > 0;
  const engaged = hovered || focused || hasQuery;
  // Transient engagement — drives the MOTION (scale / glow / glyph slide) so it
  // releases on hover-out / blur. `engaged` above keeps a filled query's lifted
  // surface after blur, but never the animation.
  const lit = hovered || focused;

  const setHover = useCallback(
    (next: boolean) => setHovered(reduceMotion ? false : next),
    [reduceMotion]
  );

  const handleClear = useCallback(() => {
    if (value.length > 0) {
      onChangeText("");
      onClear?.();
    } else {
      onCollapse?.();
    }
  }, [value, onChangeText, onClear, onCollapse]);

  // No border, no outline: hover / focus / query read through the surface
  // colour + the search glyph tint only. The transition class differs per
  // branch: the collapsed stub's scale is spring-driven by PressableScale (a
  // CSS transform transition would fight the spring), the expanded bar owns an
  // inline transform that `transition-all` carries on the same 150ms clock as
  // the colour swap.
  const pillClass = (branchTransition: string) =>
    cn(
      // `relative` anchors the glow overlay on web — RN absolute children
      // always resolve against their parent on native, but the DOM needs an
      // explicitly positioned ancestor.
      "relative flex-row items-center h-11 rounded-full px-4 gap-2 border-0",
      engaged ? liftedSurface : restSurface,
      !reduceMotion && branchTransition,
      className
    );

  // Soft primary halo (web): rendered as its own first child so it paints
  // behind the glyph/text and fades through its own `transition-opacity`.
  const glow = isWeb ? (
    <GlowOverlay
      lit={lit}
      color={tokens.colors.primary}
      reduceMotion={reduceMotion}
    />
  ) : null;

  const hoverProps = {
    onHoverIn: isWeb ? () => setHover(true) : undefined,
    onHoverOut: isWeb ? () => setHover(false) : undefined,
    onFocus: () => {
      setFocused(true);
      setHover(true);
    },
    onBlur: () => {
      setFocused(false);
      setHover(false);
    },
  };

  // Web hover on the container: cast keeps TS happy (RN-web forwards it).
  const containerHoverProps: Record<string, () => void> = isWeb
    ? {
        onHoverIn: () => setHover(true),
        onHoverOut: () => setHover(false),
      }
    : {};

  // ── Collapsed (pressable stub) ───────────────────────────────────
  if (onPress && !expanded) {
    return (
      <PressableScale
        onPress={onPress}
        scaleOnPress={reduceMotion ? 1 : SEARCH_BAR_SCALE_PRESS}
        scaleOnHover={reduceMotion ? 1 : SEARCH_BAR_SCALE_HOVER}
        {...hoverProps}
        accessible
        accessibilityRole="button"
        accessibilityLabel={hasQuery ? value : placeholder}
        className={pillClass("transition-colors duration-150")}
      >
        {glow}
        <SearchGlyph lit={lit} engaged={engaged} reduceMotion={reduceMotion} />
        <Text
          className={cn(
            "flex-1 text-base font-inter",
            hasQuery ? "text-neutral-900 dark:text-neutral-50" : "text-neutral-500"
          )}
          numberOfLines={1}
        >
          {hasQuery ? value : placeholder}
        </Text>
        {hasQuery ? <ClearButton onPress={handleClear} /> : null}
      </PressableScale>
    );
  }

  // ── Expanded ─────────────────────────────────────────────────────
  return (
    <View
      className={pillClass("transition-all duration-150")}
      {...containerHoverProps}
      // Caller-owned transform (the useHoverLift pattern): `transition-all`
      // above puts the scale on the same 150ms clock as the colour swap.
      style={{
        transform: [{ scale: lit && !reduceMotion ? SEARCH_BAR_SCALE_HOVER : 1 }],
      }}
    >
      {glow}
      <SearchGlyph lit={lit} engaged={engaged} reduceMotion={reduceMotion} />
      <TextInput
        className="flex-1 text-base font-inter text-neutral-900 dark:text-neutral-50 outline-none"
        placeholder={placeholder}
        placeholderTextColor={tokens.colors["text-tertiary"]}
        value={value}
        onChangeText={onChangeText}
        autoFocus={autoFocus}
        returnKeyType="search"
        onSubmitEditing={onSubmitEditing}
        onFocus={hoverProps.onFocus}
        onBlur={hoverProps.onBlur}
        accessible
        accessibilityLabel={placeholder}
        accessibilityRole="search"
        // Kill the browser / Android default focus ring — focus is conveyed
        // by the lifted surface + primary icon, never a dark outline.
        style={{ outlineStyle: "none" } as never}
      />
      {value.length > 0 ? <ClearButton onPress={handleClear} /> : null}
    </View>
  );
}