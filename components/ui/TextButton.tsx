// ---------------------------------------------------------------------------
// PULSE DESIGN SYSTEM — TextButton
//
// The label-first counterpart of <Button>: an action expressed as words
// ("S'inscrire", "Suivre", "Message", "Annuler", "Enregistrer", "Confirmer"…)
// rather than as a filled capsule. It speaks the exact same motion language as
// the rest of the system, so a text action never feels like a different control:
//   shared base (every tone): pointer hover (web) + keyboard focus (every
//   platform) LIFT the label to TEXT_BUTTON_SCALE_HOVER and deepen its
//   colour, faded over the shared 150ms colour transition — the <IconButton>
//   rule: the surface reaches the colour it would have when pressed, so
//   hover and press read as one gesture; press squashes to
//   TEXT_BUTTON_SCALE_PRESS with the shared spring (friction 6 /
//   tension 300); prefers-reduced-motion keeps every state change, it just
//   snaps.
//   signature move (one per tone, all ≤4px / ≤180ms, ease-out — felt, never
//   flashy): link "nudge" (directional glyph travels TEXT_BUTTON_NUDGE_PX),
//   danger "underline" (2px rule sweeps out from the left edge), toggle
//   "settle" (press pop TEXT_BUTTON_SCALE_POP + scale-settle on flip),
//   neutral "lift" (shared base only — the calm default that makes the
//   other three read as intentional).
//
// Intents (`tone`) and their default signature motion:
//   link     primary text action — tints into the IconButton "primary" surface
//            ("nudge": directional glyph travels TEXT_BUTTON_NUDGE_PX)
//   neutral  plain text action / menu row — ink on a neutral chip once lifted
//            ("lift": shared base only, no signature move)
//   danger   destructive text action — error tint plus an underline that sweeps
//            out from the left on hover/focus ("underline")
//   toggle   state chip — a stronger snap-back pop, a scale-settle on flip, and
//            a permanently lifted pill while `active` ("settle")
// Accessibility: 44px touch target by default via hitSlop (callers may widen
// it, never narrow it); visible keyboard focus ring on web that does not rely
// on colour alone; `role` override for rows that behave as links; plain-string
// children double as the accessible name; disabled + selected are exposed via
// accessibilityState.
//
// Usage:
//   <TextButton tone="link" onPress={close}>{t("common.cancel")}</TextButton>
//   <TextButton tone="danger" icon="Trash2" onPress={remove}>Supprimer</TextButton>
//   <TextButton tone="toggle" active={selected} onPress={flip}>Suivi</TextButton>
// ---------------------------------------------------------------------------

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Easing, Platform, View } from "react-native";
import type { PressableProps } from "react-native";

import { Arrow, isArrowIcon, useArrowNudge } from "@/components/ui/Arrow";
import {
  BUTTON_SCALE_HOVER,
  BUTTON_TRANSITION_MS,
} from "@/components/ui/Button";
import { Icon, type IconColor, type IconName } from "@/components/ui/Icon";
import { PressableScale } from "@/components/ui/PressableScale";
import { Text, type TextVariant } from "@/components/ui/Text";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import type {
  AccessibilityHintProps,
  AccessibilityLabelProps,
} from "@/src/accessibility";
import { cn } from "@/utils/format";

// ---------------------------------------------------------------------------
// Types + motion tokens
// ---------------------------------------------------------------------------

export type TextButtonTone = "link" | "neutral" | "danger" | "toggle";
export type TextButtonSize = "sm" | "md";
export type TextButtonMotion = "lift" | "underline" | "nudge" | "settle";

/** The lift is shared with <Button> — one gesture family for every label. */
export const TEXT_BUTTON_SCALE_HOVER = BUTTON_SCALE_HOVER;
/** Shared press squash for label-sized controls (PressableScale's default). */
export const TEXT_BUTTON_SCALE_PRESS = 0.94;
/** Toggle intents pop a little harder so a state flip feels mechanical. */
export const TEXT_BUTTON_SCALE_POP = 0.9;
/** Shared colour-fade duration — the same 150ms as every other control. */
export const TEXT_BUTTON_TRANSITION_MS = BUTTON_TRANSITION_MS;
/** Thickness (px) of the danger underline that sweeps in on hover/focus. */
export const TEXT_BUTTON_UNDERLINE_PX = 2;
/** Travel (px) of the link arrow on hover/focus — the shared 4px nudge. */
export const TEXT_BUTTON_NUDGE_PX = 4;
/** Danger underline sweep-in duration (ms) — eased out, same as the fade. */
export const TEXT_BUTTON_UNDERLINE_IN_MS = 150;
/** Danger underline sweep-out duration (ms) — quicker, so release is crisp. */
export const TEXT_BUTTON_UNDERLINE_OUT_MS = 120;
/** Toggle state-settle dip duration (ms) — a felt, not seen, confirmation. */
export const TEXT_BUTTON_TOGGLE_SETTLE_MS = 180;

export interface TextButtonProps
  extends AccessibilityLabelProps,
    AccessibilityHintProps {
  /** Visible label. A plain string doubles as the accessible name. */
  children: React.ReactNode;
  onPress?: () => void;
  /** Semantic colour family. Default "neutral". */
  tone?: TextButtonTone;
  /** Density: "md" (default) or compact "sm" for inline rows. */
  size?: TextButtonSize;
  /**
   * Motion family. Defaults per tone (link → "nudge" when it carries a
   * directional icon, danger → "underline", toggle → "settle", neutral →
   * "lift"), so most call sites never pass it — it exists for the few rows
   * that need a different signature.
   */
  motion?: TextButtonMotion;
  /**
   * AT role. Default "button"; pass "link" for rows that open an external
   * URL, so screen readers announce the right semantics.
   */
  role?: "button" | "link";
  /** Selected / toggled-on state — keeps the pill lifted (tone "toggle"). */
  active?: boolean;
  disabled?: boolean;
  /** Optional glyph placed before the label. */
  icon?: IconName;
  /** Optional glyph after the label — nudges through <Arrow> when directional. */
  iconRight?: IconName;
  /** Icon size in px. Default 16. */
  iconSize?: number;
  /** Overrides the tone's icon colour token. */
  iconColor?: IconColor;
  /** Typographic variant of the label. Default "buttonLabel". */
  labelVariant?: TextVariant;
  /** Sizing classes for the label itself (flex, weight) — never colour. */
  labelClassName?: string;
  /** Extra classes merged last — layout, padding, positioning. */
  className?: string;
  /** Passthrough hitSlop so a short label can still reach the 44px target. */
  hitSlop?: PressableProps["hitSlop"];
  /** Test identifier for E2E and unit tests. */
  testID?: string;
}

// ---------------------------------------------------------------------------
// Style maps — rest / lifted / pressed, per tone
// ---------------------------------------------------------------------------

/** Signature motion each tone defaults to — the "shared + custom" system. */
const toneMotion: Record<TextButtonTone, TextButtonMotion> = {
  link: "nudge",
  neutral: "lift",
  danger: "underline",
  toggle: "settle",
};

/** Container density per size — sm is for inline rows ("Voir plus"). */
const sizeContainer: Record<TextButtonSize, string> = {
  sm: "gap-1 rounded-md px-1 py-0.5",
  md: "gap-1.5 rounded-lg",
};

/** Default label typography per size (caller `labelVariant` wins). */
const sizeLabelDefault: Record<TextButtonSize, TextVariant> = {
  sm: "caption",
  md: "buttonLabel",
};

/** Label colour at rest. */
const toneText: Record<TextButtonTone, string> = {
  link: "text-primary dark:text-primary-dark",
  neutral: "text-text-primary dark:text-text-primary-dark",
  danger: "text-error-600",
  toggle: "text-primary dark:text-primary-dark",
};

/** Label colour once lifted (hover / focus / `active`). */
const toneLiftText: Record<TextButtonTone, string> = {
  link: "text-primary-hover dark:text-primary-hover-dark",
  neutral: "text-text-primary dark:text-text-primary-dark",
  danger: "text-error-600",
  toggle: "text-primary-active dark:text-primary-active-dark",
};

/** Surface at rest — a text button is transparent until engaged. */
const toneSurface: Record<TextButtonTone, string> = {
  link: "",
  neutral: "",
  danger: "",
  toggle: "bg-primary/10 dark:bg-primary-dark/15",
};

/** Surface on hover/focus (and on `active`, so a selected chip reads engaged). */
const toneSurfaceLift: Record<TextButtonTone, string> = {
  link: "bg-primary/10 dark:bg-primary-dark/15",
  neutral: "bg-neutral-100 dark:bg-neutral-800",
  danger: "bg-error-500/10 dark:bg-error-dark/15",
  toggle: "bg-primary/20 dark:bg-primary-dark/25",
};

/** Pressed surface — the lifted colours under `active:`, for touch presses. */
const toneSurfacePressed: Record<TextButtonTone, string> = {
  link: "active:bg-primary/10 dark:active:bg-primary-dark/15",
  neutral: "active:bg-neutral-100 dark:active:bg-neutral-800",
  danger: "active:bg-error-500/10 dark:active:bg-error-dark/15",
  toggle: "active:bg-primary/20 dark:active:bg-primary-dark/25",
};

/** Icon colour token per tone — the same tokens <IconButton> uses. */
const toneIcon: Record<TextButtonTone, IconColor> = {
  link: "primary",
  neutral: "text-secondary",
  danger: "error-600",
  toggle: "primary",
};

// ---------------------------------------------------------------------------
// UnderlineSweep — the danger intent's signature move
// ---------------------------------------------------------------------------

/**
 * A 2px rule that grows out from the left edge under the label while the
 * control is engaged (hover / focus / `active`). `width` is animated rather
 * than `scaleX` so the sweep starts at the exact left edge whatever transform
 * origin the platform uses; it is absolutely positioned, so it never reflows
 * the row around it.
 */
function UnderlineSweep({ active, testID }: { active: boolean; testID?: string }) {
  const reduceMotion = useReducedMotion();
  const progress = useRef(new Animated.Value(0)).current;
  const [labelWidth, setLabelWidth] = useState(0);

  useEffect(() => {
    if (reduceMotion) {
      progress.setValue(active ? 1 : 0);
      return;
    }
    Animated.timing(progress, {
      toValue: active ? 1 : 0,
      duration: active ? TEXT_BUTTON_UNDERLINE_IN_MS : TEXT_BUTTON_UNDERLINE_OUT_MS,
      easing: Easing.out(Easing.quad),
      // `width` is a layout property — it cannot run on the native driver.
      useNativeDriver: false,
    }).start();
  }, [active, progress, reduceMotion]);

  const lineWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, labelWidth],
  });

  return (
    <View
      pointerEvents="none"
      testID={testID}
      onLayout={(e) => setLabelWidth(e.nativeEvent.layout.width)}
      style={{ position: "absolute", left: 0, right: 0, bottom: -3 }}
    >
      <Animated.View
        className="bg-error-600 dark:bg-error-dark"
        style={{ height: TEXT_BUTTON_UNDERLINE_PX, width: lineWidth }}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TextButton({
  children,
  onPress,
  tone = "neutral",
  size = "md",
  motion,
  role = "button",
  active = false,
  disabled = false,
  icon,
  iconRight,
  iconSize = 16,
  iconColor,
  labelVariant,
  labelClassName,
  className,
  hitSlop,
  testID,
  accessibilityLabel,
  accessibilityHint,
}: TextButtonProps) {
  const reduceMotion = useReducedMotion();
  const isWeb = Platform.OS === "web";

  const [hovered, setHovered] = useState(false);
  const hoveredRef = useRef(false);
  // Separate keyboard-focus tracking so the focus ring only renders for
  // keyboard users — pointer hover gets the chip tint without an outline.
  const [focused, setFocused] = useState(false);
  const focusedRef = useRef(false);
  // Pressed label feedback on touch (no hover there): the label deepens one
  // step while the finger is down, mirroring the `active:` surface.
  const [pressed, setPressed] = useState(false);

  const setTo = useCallback(
    (next: boolean) => {
      const value = !disabled && next;
      if (hoveredRef.current === value) return;
      hoveredRef.current = value;
      setHovered(value);
    },
    [disabled]
  );

  const setFocusTo = useCallback(
    (next: boolean) => {
      const value = !disabled && next;
      if (focusedRef.current === value) return;
      focusedRef.current = value;
      setFocused(value);
      // Focus is the keyboard affordance for the same lift — but tracked
      // separately so the ring belongs to keyboard users only.
      setTo(next);
    },
    [disabled, setTo]
  );

  // A button that becomes disabled while hovered/focused releases the lift,
  // otherwise it would stay stuck in its lifted colour.
  useEffect(() => {
    if (disabled && (hoveredRef.current || focusedRef.current)) {
      hoveredRef.current = false;
      focusedRef.current = false;
      setHovered(false);
      setFocused(false);
    }
  }, [disabled]);

  // Resolve the signature motion: explicit `motion` wins, otherwise the
  // tone's default — except a link with no directional glyph has nothing to
  // nudge, so it falls back to the shared lift.
  const hasDirectionalGlyph =
    (icon != null && isArrowIcon(icon)) ||
    (iconRight != null && isArrowIcon(iconRight));
  const resolvedMotion: TextButtonMotion =
    motion ?? (tone === "link" && !hasDirectionalGlyph ? "lift" : toneMotion[tone]);

  const showUnderline = resolvedMotion === "underline";
  const showNudge = resolvedMotion === "nudge" && hasDirectionalGlyph;

  // The arrow rides the very same events as the surface lift.
  const nudge = useArrowNudge({ disabled: disabled || !showNudge });

  // The toggle settle: a dip-and-recover on the flip, driven by the same
  // shared spring as press (friction 6 / tension 300) through an Animated
  // value layered on the settle only — never stacked with PressableScale's
  // press squash, which is idle at that moment (flip happens onPress, after
  // the squash already released).
  const settleScale = useRef(new Animated.Value(1)).current;
  const prevActiveRef = useRef(active);
  useEffect(() => {
    if (
      resolvedMotion === "settle" &&
      prevActiveRef.current !== active &&
      !disabled
    ) {
      if (reduceMotion) {
        settleScale.setValue(1);
      } else {
        settleScale.setValue(TEXT_BUTTON_SCALE_POP);
        Animated.spring(settleScale, {
          toValue: 1,
          friction: 6,
          tension: 300,
          useNativeDriver: true,
        }).start();
      }
    }
    prevActiveRef.current = active;
  }, [active, disabled, reduceMotion, resolvedMotion, settleScale]);

  // A selected toggle reads as "already engaged", like <IconButton active>.
  const lifted = hovered || active;

  // Pressed label deepening (touch): the label reaches its lifted colour
  // while the finger is down, so press feedback never depends on hover.
  const labelLifted = lifted || pressed;

  // The colour fade that turns the surface swap into an animation. Dropped
  // under reduced motion: the state still changes, it just snaps.
  const transition = cn(!reduceMotion && "transition-colors", "duration-150");

  const glyphColor = iconColor ?? toneIcon[tone];

  const renderGlyph = (name: IconName) =>
    isArrowIcon(name) ? (
      <Arrow active={nudge.active} name={name} size={iconSize} color={glyphColor} />
    ) : (
      <Icon name={name} size={iconSize} color={glyphColor} decorative />
    );

  const label = (
    <Text
      variant={labelVariant ?? sizeLabelDefault[size]}
      className={cn(
        toneText[tone],
        labelLifted && toneLiftText[tone],
        transition,
        labelClassName
      )}
    >
      {children}
    </Text>
  );

  // The 44px touch target: text rows are often a single short word, so the
  // pressable area expands by default without changing layout. Callers may
  // widen the slop, never narrow it.
  const effectiveHitSlop = hitSlop ?? { top: 10, bottom: 10, left: 8, right: 8 };

  return (
    <Animated.View style={{ transform: [{ scale: settleScale }] }}>
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      // Springs come from PressableScale, which already respects
      // prefers-reduced-motion for us.
      scaleOnPress={
        tone === "toggle" ? TEXT_BUTTON_SCALE_POP : TEXT_BUTTON_SCALE_PRESS
      }
      scaleOnHover={TEXT_BUTTON_SCALE_HOVER}
      hitSlop={effectiveHitSlop}
      testID={testID}
      accessibilityRole={role}
      accessibilityLabel={
        accessibilityLabel ??
        (typeof children === "string" ? (children as string) : undefined)
      }
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled, selected: active }}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      onHoverIn={
        isWeb
          ? () => {
              nudge.onHoverIn?.();
              setTo(true);
            }
          : undefined
      }
      onHoverOut={
        isWeb
          ? () => {
              nudge.onHoverOut?.();
              setTo(false);
            }
          : undefined
      }
      onFocus={() => {
        nudge.onFocus?.();
        setFocusTo(true);
      }}
      onBlur={() => {
        nudge.onBlur?.();
        setFocusTo(false);
      }}
      className={cn(
        "flex-row items-center justify-center",
        sizeContainer[size],
        transition,
        toneSurface[tone],
        lifted && toneSurfaceLift[tone],
        !disabled && toneSurfacePressed[tone],
        // Visible keyboard focus ring (web): an outline that does not rely
        // on colour alone — pointer hover gets the chip tint without it.
        isWeb && focused && !disabled && "outline outline-2 outline-primary outline-offset-2",
        disabled && "opacity-50",
        className
      )}
    >
      {icon ? renderGlyph(icon) : null}
      {showUnderline ? (
        <View className="relative">
          {label}
          <UnderlineSweep
            active={lifted}
            testID={testID ? `${testID}-underline` : undefined}
          />
        </View>
      ) : (
        label
      )}
      {iconRight ? renderGlyph(iconRight) : null}
    </PressableScale>
    </Animated.View>
  );
}
