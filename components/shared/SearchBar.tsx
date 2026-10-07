// ---------------------------------------------------------------------------
// PULSE DESIGN SYSTEM — SearchBar (shared)
//
// Single search pill used in feed / explore / conversations.
// Motion (coherent with IconButton / Button / Arrow — 150ms fades, glyph
// nudge, all gated by useReducedMotion). Three rules govern everything below;
// between them the bar never paints over (or vacates space beside) the
// neighbouring title / icon buttons in the packed header row:
//   - Growth is VERTICAL ONLY and goes through layout, never a scale: the pill
//     swaps SEARCH_BAR_HEIGHT_REST → SEARCH_BAR_HEIGHT_GROWN (h-11 → h-12),
//     so the header row re-flows instead of the pill painting over a
//     neighbour, and a SEARCH_BAR_GROW_LIFT `top` pin keeps the bottom edge
//     on the row line while the extra height extends upward.
//   - Pointer hover (web) replays on every entry (hoverCount bumps the
//     glyph's replay key): the surface lifts neutral-100 → neutral-200 (dark:
//     800 → 700), the search glyph tints to primary and slides
//     SEARCH_BAR_GLYPH_NUDGE px right, a soft primary halo fades in around
//     the pill (web), and the bar grows — all on the same 150ms clock.
//   - Press (collapsed stub) is a small inward spring squash to
//     SEARCH_BAR_SQUASH_Y_PRESS on the element's single transform — the one
//     channel hover never writes (hover = layout + colour) — so a hovered
//     press composes with the hover state instead of swapping to a competing
//     branch mid-interaction.
//   - Persistent engagement: `engaged` (lit || a filled query) keeps the
//     lifted surface, the grown height and the primary icon tint after blur,
//     so a filled bar stays readable without staying lit.
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
 * Collapsed height when idle; grows to h-12 on pointer hover, keyboard focus,
 * or a filled query via layout (not a transform), so the header row re-flows
 * instead of the bar painting over a neighbour the way a uniform scale would.
 * Press keeps its own spring squash on top (see SEARCH_BAR_SQUASH_Y_PRESS) —
 * hover never swaps the transform branch, so the two compose.
 */
export const SEARCH_BAR_HEIGHT_REST = "h-11";
/** Hover / focus / filled height — strictly taller, never wider. */
export const SEARCH_BAR_HEIGHT_GROWN = "h-12";
/**
 * Focus/hover lift (px, web): the grown bar rises half its height delta so the
 * extra 4px extends upward and the bottom edge stays pinned to the row.
 */
export const SEARCH_BAR_GROW_LIFT = 2;
/**
 * Press dimple (collapsed stub): the spring squash target is exactly
 * (1 − SEARCH_BAR_PRESS_DIMPLE) ≈ 0.985 along the shared Y axis — a faint
 * inward dimple strictly inside the layout box, so the click animation can
 * never shrink the bar's box and expose the background beside it.
 */
export const SEARCH_BAR_PRESS_DIMPLE = 0.015;
/** The press spring's target scale — exactly (1 − SEARCH_BAR_PRESS_DIMPLE). */
export const SEARCH_BAR_SQUASH_Y_PRESS = 1 - SEARCH_BAR_PRESS_DIMPLE;
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
  replayKey,
}: {
  /** True while lit (pointer hover or keyboard focus) — drives the slide. */
  lit: boolean;
  /** True while engaged (lit or a query) — drives the tint. */
  engaged: boolean;
  reduceMotion: boolean;
  /**
   * Bumps on every hover-in so the nudge replays from rest: a plain
   * `lit`-keyed effect won't restart when the flag holds the same value
   * across quick re-entries, but the key always flips.
   */
  replayKey: number;
}) {
  const translateX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const to = lit ? SEARCH_BAR_GLYPH_NUDGE : 0;
    if (reduceMotion) {
      // Still move, just without the animation (reduced-motion UX).
      translateX.setValue(to);
      return;
    }
    // Stop any in-flight slide and replay from the live position: re-entering
    // mid-fade-out restarts the nudge instead of sticking part-way out.
    translateX.stopAnimation((current: number) => {
      translateX.setValue(current);
      Animated.timing(translateX, {
        toValue: to,
        duration: SEARCH_BAR_TRANSITION_MS,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    });
    // `replayKey` intentionally re-runs the slide on every hover-in.
  }, [lit, replayKey, reduceMotion, translateX]);

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
  const [pointerInside, setPointerInside] = useState(false);
  // Bumps on every hover-in so pointer-driven effects (the glyph nudge)
  // replay from rest even when `lit` held the same value across the entry —
  // e.g. keyboard focus kept it true before the mouse arrived.
  const [hoverCount, setHoverCount] = useState(0);
  const [focused, setFocused] = useState(false);
  const isWeb = Platform.OS === "web";
  const hasQuery = value.trim().length > 0;

  // Hover stays the single source of truth for the pointer (web only), and is
  // never touched by focus/blur — so the hover animation keeps playing every
  // time the mouse comes back over the bar, even after a click elsewhere or
  // a keyboard-focus cycle.
  useEffect(() => {
    if (!isWeb) return;
    // Switching tabs/windows ends any in-flight hover: the next mouseenter
    // then starts the animation from rest instead of sticking in the lit end
    // state.
    const onWindowBlur = () => setPointerInside(false);
    window.addEventListener("blur", onWindowBlur);
    return () => window.removeEventListener("blur", onWindowBlur);
  }, [isWeb]);

  // `focused` is tracked separately for the keyboard affordance, and both
  // drive `lit`:
  //   lit = pointerInside || focused
  // `engaged` additionally keeps the lifted surface and the grown height
  // while a query is present after blur, but never the transient motion.
  const lit = pointerInside || focused;
  const engaged = lit || hasQuery;

  // The grown box tracks engagement exactly: strictly taller (h-11 → h-12),
  // never wider — layout re-flow instead of a scale, so the pill can't paint
  // over the header title or icon buttons beside it, and the press spring
  // composes with it rather than swapping it out.
  const grown = engaged;

  const handleClear = useCallback(() => {
    if (value.length > 0) {
      onChangeText("");
      onClear?.();
    } else {
      onCollapse?.();
    }
  }, [value, onChangeText, onClear, onCollapse]);

  // No border, no outline: hover / focus / query read through the surface
  // colour, the search glyph and the taller box. Transition lists differ per
  // branch: the expanded bar has no spring of its own, so `transition-all`
  // carries grow, pin and colour on one 150ms clock; the stub names exactly
  // its hover-driven properties — `transition-all` would also tween the
  // `transform` PressableScale's press spring writes every frame.
   const pillClass = (branchTransition: string) =>
     cn(
       // `relative` anchors the glow overlay on web — RN absolute children
       // always resolve against their parent on native, but the DOM needs an
       // explicitly positioned ancestor.
      "relative flex-row items-center rounded-full px-4 gap-2 border-0",
      // Vertical-only grow via layout (never a scale): rest ↔ grown box.
      grown && !reduceMotion ? SEARCH_BAR_HEIGHT_GROWN : SEARCH_BAR_HEIGHT_REST,
       engaged ? liftedSurface : restSurface,
       !reduceMotion && branchTransition,
       className
    );


  // Bottom-edge pin for the grown bar: a relative `top` offset (the pill is
  // already `relative`), deliberately NOT a transform — on the stub the
  // transform channel belongs to PressableScale's press spring, and a style
  // transform here would clobber it; the expanded bar needs none. `top`
  // composes with the spring, so hover → press chains without a branch swap.
  const grownStyle = {
    top: grown && !reduceMotion ? -SEARCH_BAR_GROW_LIFT : 0,
  };

  const glow = isWeb ? (
    <GlowOverlay
      lit={lit}
      color={tokens.colors.primary}
      reduceMotion={reduceMotion}
    />
  ) : null;

  const hoverProps = {
    onHoverIn: isWeb
      ? () => {
          setPointerInside(true);
          setHoverCount((c) => c + 1);
        }
      : undefined,
    onHoverOut: isWeb ? () => setPointerInside(false) : undefined,
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
  };


  // Web hover on the container: cast keeps TS happy (RN-web forwards it).
  const containerHoverProps: Record<string, () => void> = isWeb
    ? {
        onHoverIn: () => {
          setPointerInside(true);
          setHoverCount((c) => c + 1);
        },
        onHoverOut: () => setPointerInside(false),
      }
    : {};

  // ── Collapsed (pressable stub) ───────────────────────────────────
  if (onPress && !expanded) {
    // Grow / pin ride layout (h-11 → h-12 + `top`), never a transform, so
    // the pill's only transform stays PressableScale's press spring: every
    // hover visual is still in place when the click spring fires, and the
    // two compose instead of swapping branches mid-interaction. The
    // transition list names exactly the hover-driven properties —
    // `transition-all` would also tween `transform` and fight the spring.
    return (
      <PressableScale
        onPress={onPress}
        scaleOnPress={reduceMotion ? 1 : SEARCH_BAR_SQUASH_Y_PRESS}
        {...hoverProps}
        style={grownStyle}
        accessible
        accessibilityRole="button"
        accessibilityLabel={hasQuery ? value : placeholder}
        className={pillClass("transition-[height,top,background-color] duration-150")}
      >
        {glow}
        <SearchGlyph lit={lit} engaged={engaged} reduceMotion={reduceMotion} replayKey={hoverCount} />
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
  // The grow itself is the layout swap inside pillClass; `transition-all`
  // carries box, pin and colour on one 150ms clock. No transform anywhere
  // on this branch — growth is reflow, never paint outside the box.
  return (
    <View
      className={pillClass("transition-all duration-150")}
      {...containerHoverProps}
      style={grownStyle}
    >
      {glow}
      <SearchGlyph lit={lit} engaged={engaged} reduceMotion={reduceMotion} replayKey={hoverCount} />
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
