// ---------------------------------------------------------------------------
// PULSE DESIGN SYSTEM — SearchBar (shared)
//
// Single search pill used in feed / explore / conversations.
// Motion (coherent with IconButton / Button / Arrow — 150ms fades, glyph
// nudge, all gated by useReducedMotion). Two INDEPENDENT channels drive the
// pill; they render together instead of competing, and between them the bar
// never paints over (or vacates space beside) the neighbouring title / icon
// buttons in the packed header row:
//   - HOVER (pointer only, web): a little, simple animation — the surface
//     lifts neutral-100 → neutral-200 (dark: 800 → 700) and the search glyph
//     tints to primary and slides SEARCH_BAR_GLYPH_NUDGE px right, replaying
//     on every entry (hoverCount bumps the glyph's replay key). It never
//     grows the box and never draws a border, and it disappears the moment
//     the pointer leaves (hoverOut / window blur) — even while the bar is
//     clicked.
//   - CLICK (`active`): what the bar shows after a click until a click lands
//     outside it. The border turns the theme's primary blue as a flat
//     `border-2` ring — deliberately NOT a glow, there is no boxShadow halo
//     anywhere — and the pill grows one step, SEARCH_BAR_HEIGHT_REST →
//     SEARCH_BAR_HEIGHT_GROWN (h-11 → h-12), through LAYOUT (never a scale)
//     with a SEARCH_BAR_GROW_LIFT `top` pin, so the row re-flows instead of
//     the pill painting over a neighbour. The expanded field arms it through
//     focus (blur = the click landed outside); the collapsed stub arms it on
//     press-in and a document pointerdown outside the pill disarms it. So
//     click = hover animation + blue border + taller box while the pointer
//     is over the bar, and pulling the pointer away drops exactly the hover
//     half until it comes back.
//   - Press (collapsed stub) is a small inward spring squash to
//     SEARCH_BAR_SQUASH_Y_PRESS on the element's single transform — the one
//     channel neither state writes (hover/click = layout + colour) — so a
//     hovered press composes with both states instead of swapping branches
//     mid-interaction.
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
 * Collapsed height when idle; grows to h-12 ONLY while clicked, through
 * layout (not a transform), so the header row re-flows instead of the bar
 * painting over a neighbour the way a uniform scale would. Hover never grows
 * the box. Press keeps its own spring squash on top (see
 * SEARCH_BAR_SQUASH_Y_PRESS) — neither state writes the transform channel.
 */
export const SEARCH_BAR_HEIGHT_REST = "h-11";
/** Clicked height — strictly taller, never wider. */
export const SEARCH_BAR_HEIGHT_GROWN = "h-12";
/**
 * Click lift (px, web): the grown bar rises half its height delta so the
 * extra 4px extends upward and the bottom edge stays pinned to the row.
 */
export const SEARCH_BAR_GROW_LIFT = 2;
/**
 * Press dimple (collapsed stub): the spring squash target is exactly
 * (1 − SEARCH_BAR_PRESS_DIMPLE) ≈ 0.985 along the shared Y axis — a faint
 * inward dimple strictly inside the layout box, so the press can never
 * shrink the bar's box and expose the background beside it.
 */
export const SEARCH_BAR_PRESS_DIMPLE = 0.015;
/** The press spring's target scale — exactly (1 − SEARCH_BAR_PRESS_DIMPLE). */
export const SEARCH_BAR_SQUASH_Y_PRESS = 1 - SEARCH_BAR_PRESS_DIMPLE;
/** Colour-fade duration shared with IconButton / Button. */
export const SEARCH_BAR_TRANSITION_MS = 150;
/** Travel (px) of the search glyph on hover — the field "opens up". */
export const SEARCH_BAR_GLYPH_NUDGE = 5;

const restSurface = "bg-neutral-100 dark:bg-neutral-800";
const liftedSurface = "bg-neutral-200 dark:bg-neutral-700";

/**
 * The click state's affordance: a flat primary ring (light/dark themed via
 * the `dark:` twin), never a glow. The WIDTH is a constant `border-2` even at
 * rest (transparent), so arming/disarming only tweens colour — the content
 * box never shifts and the pill can never paint outside itself.
 */
const activeBorder = "border-primary dark:border-primary-dark";
const restBorder = "border-transparent";

const clearRest = "bg-neutral-300/60 dark:bg-neutral-600/60";
const clearLifted = "bg-neutral-400/80 dark:bg-neutral-500/80";

// ---------------------------------------------------------------------------
// Search glyph — tints and slides right while the bar is HOVERED, so hover
// reads as the field "opening up". Same nudge language as <Arrow> (150ms
// ease-out, snaps under reduced motion). The click state never touches it:
// the blue border + taller box are the click's own, distinct affordance.
// ---------------------------------------------------------------------------

function SearchGlyph({
  lit,
  reduceMotion,
  replayKey,
}: {
  /** True while hovered (pointer over, web) — drives slide AND tint. */
  lit: boolean;
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
      <Icon name="Search" size={18} color={lit ? "primary" : "text-tertiary"} />
    </Animated.View>
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
  // e.g. the click state kept the bar engaged before the mouse arrived.
  const [hoverCount, setHoverCount] = useState(0);
  // Click state: armed by a click (field focus / stub press-in), disarmed by
  // a click landing outside the pill (document pointerdown) or by blur.
  const [active, setActive] = useState(false);
  const isWeb = Platform.OS === "web";
  const hasQuery = value.trim().length > 0;
  // The pill itself (or the stub's wrapper): the click-outside listener
  // checks containment against it so presses that START inside the pill
  // (padding, glyph, clear chip) never disarm the click state.
  const rootRef = useRef<View>(null);
  const inputRef = useRef<TextInput>(null);

  // Hover stays the single source of truth for the pointer (web only), and is
  // never touched by focus/blur or by the click state — so the hover
  // animation keeps playing every time the mouse comes back over the bar,
  // even while the click state is holding the border and the taller box.
  useEffect(() => {
    if (!isWeb) return;
    // Switching tabs/windows ends any in-flight hover: the next mouseenter
    // then starts the animation from rest instead of sticking in the lit end
    // state.
    const onWindowBlur = () => setPointerInside(false);
    window.addEventListener("blur", onWindowBlur);
    return () => window.removeEventListener("blur", onWindowBlur);
  }, [isWeb]);

  // Click outside: any pointerdown that lands outside the pill disarms the
  // click state ("the click animation disappears if the user clicks anywhere
  // outside"). Capture phase, so it runs before the press itself; containment
  // keeps presses that start inside the pill from disarming it. The expanded
  // field additionally clears on blur, which covers Tab presses and native
  // taps where no document listener exists.
  useEffect(() => {
    if (!isWeb || !active || typeof document === "undefined") return;
    const onPointerDown = (event: Event) => {
      const root = rootRef.current as unknown as {
        contains?: (node: Node) => boolean;
      } | null;
      const target = event.target as Node | null;
      if (
        root &&
        typeof root.contains === "function" &&
        target &&
        root.contains(target)
      ) {
        return; // Press started inside the pill — the click state stays.
      }
      setActive(false);
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [isWeb, active]);

  // The two channels, kept apart on purpose:
  //   lit    = pointer over the bar → hover's little animation only.
  //   active = bar clicked          → blue border + taller box only.
  // Rendering adds them, so clicked + hovered shows both, and pulling the
  // pointer away drops exactly the hover half until it comes back.
  const lit = pointerInside;
  const grown = active;

  const handleClear = useCallback(() => {
    if (value.length > 0) {
      onChangeText("");
      onClear?.();
    } else {
      onCollapse?.();
    }
  }, [value, onChangeText, onClear, onCollapse]);

  // The border (click) and the surface (hover) are the only painted states.
  // Transition lists differ per branch: the expanded bar has no spring of its
  // own, so `transition-all` carries grow, pin, surface and border colour on
  // one 150ms clock; the stub names exactly its animated properties —
  // `transition-all` would also tween the `transform` PressableScale's press
  // spring writes every frame.
  const pillClass = (branchTransition: string) =>
    cn(
      // `relative` carries the grow pin. The border width is a constant
      // `border-2` (transparent at rest) so arming the click state only
      // tweens colour — the content box never shifts.
      "relative flex-row items-center rounded-full px-4 gap-2 border-2",
      // Vertical-only grow via layout (never a scale): rest ↔ clicked box.
      grown && !reduceMotion ? SEARCH_BAR_HEIGHT_GROWN : SEARCH_BAR_HEIGHT_REST,
      active ? activeBorder : restBorder,
      // Hover-only surface lift — never held by the click state.
      lit ? liftedSurface : restSurface,
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

  // Pointer hover (web): the little animation's own channel — never touched
  // by focus, blur or the click state, so it can drop and re-add freely.
  const hoverProps = {
    onHoverIn: isWeb
      ? () => {
          setPointerInside(true);
          setHoverCount((c) => c + 1);
        }
      : undefined,
    onHoverOut: isWeb ? () => setPointerInside(false) : undefined,
  };

  // Click / keyboard focus: the click state itself (focus = the field was
  // clicked, blur = the click landed outside it).
  const focusProps = {
    onFocus: () => setActive(true),
    onBlur: () => setActive(false),
  };

  // Web click on the pill's chrome (padding / glyph / clear chip): a default
  // mousedown would blur the field and drop the click state for a click that
  // landed INSIDE the bar, so prevent it and focus the field explicitly —
  // clicks on the field itself fall through untouched.
  const chromeMouseDownProps: Record<
    string,
    (event: { preventDefault: () => void; target: { nodeName?: string } | null }) => void
  > = isWeb
    ? {
        onMouseDown: (event) => {
          const name = event.target?.nodeName?.toUpperCase() ?? "";
          if (name === "INPUT" || name === "TEXTAREA") return;
          event.preventDefault();
          inputRef.current?.focus();
        },
      }
    : {};

  // Native tap on the pill's chrome: focus the field so the click state arms
  // the same way it does on web. Responder negotiation is deepest-first, so
  // the field itself always wins over this container where they overlap.
  const chromePressProps = isWeb
    ? {}
    : {
        onStartShouldSetResponder: () => true,
        onResponderRelease: () => {
          inputRef.current?.focus();
        },
      };

  // ── Collapsed (pressable stub) ───────────────────────────────────
  if (onPress && !expanded) {
    // Grow / pin ride layout (h-11 → h-12 + `top`), never a transform, so
    // the pill's only transform stays PressableScale's press spring: the
    // hover visuals and the click's border/box are all still in place when
    // the click spring fires, and the three compose instead of swapping
    // branches mid-interaction. The transition list names exactly the
    // animated properties — `transition-all` would also tween `transform`
    // and fight the spring. The wrapper carries the click-outside ref
    // (PressableScale forwards none) and adds no styles of its own.
    return (
      <View ref={rootRef}>
        <PressableScale
          onPress={onPress}
          onPressIn={() => setActive(true)}
          scaleOnPress={reduceMotion ? 1 : SEARCH_BAR_SQUASH_Y_PRESS}
          {...hoverProps}
          {...focusProps}
          style={grownStyle}
          testID="search-bar"
          accessible
          accessibilityRole="button"
          accessibilityLabel={hasQuery ? value : placeholder}
          className={pillClass(
            "transition-[height,top,background-color,border-color] duration-150"
          )}
        >
          <SearchGlyph lit={lit} reduceMotion={reduceMotion} replayKey={hoverCount} />
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
      </View>
    );
  }

  // ── Expanded ─────────────────────────────────────────────────────
  // The grow itself is the layout swap inside pillClass; `transition-all`
  // carries box, pin, surface and border colour on one 150ms clock. No
  // transform anywhere on this branch — growth is reflow, never paint
  // outside the box. Chrome clicks are handled above so a click INSIDE the
  // pill can never blur the field and drop the click state.
  return (
    <View
      ref={rootRef}
      testID="search-bar"
      className={pillClass("transition-all duration-150")}
      {...hoverProps}
      {...chromeMouseDownProps}
      {...chromePressProps}
      style={grownStyle}
    >
      <SearchGlyph lit={lit} reduceMotion={reduceMotion} replayKey={hoverCount} />
      <TextInput
        ref={inputRef}
        className="flex-1 text-base font-inter text-neutral-900 dark:text-neutral-50 outline-none"
        placeholder={placeholder}
        placeholderTextColor={tokens.colors["text-tertiary"]}
        value={value}
        onChangeText={onChangeText}
        autoFocus={autoFocus}
        returnKeyType="search"
        onSubmitEditing={onSubmitEditing}
        {...focusProps}
        accessible
        accessibilityLabel={placeholder}
        accessibilityRole="search"
        // Kill the browser / Android default focus ring — focus is conveyed
        // by the flat blue border + taller box, never a dark outline.
        style={{ outlineStyle: "none" } as never}
      />
      {value.length > 0 ? <ClearButton onPress={handleClear} /> : null}
    </View>
  );
}
