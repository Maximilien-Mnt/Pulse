// ---------------------------------------------------------------------------
// PULSE DESIGN SYSTEM — TextButton
//
// The label-first counterpart of <Button>: an action expressed as words
// ("S'inscrire", "Suivre", "Message", "Annuler", "Enregistrer", "Confirmer"…)
// rather than as a filled capsule. It speaks the exact same motion language as
// the rest of the system, so a text action never feels like a different control:
//   - pointer hover (web) and keyboard focus (every platform) LIFT the label to
//     TEXT_BUTTON_SCALE_HOVER and deepen its colour, faded over the shared
//     150ms colour transition — the <IconButton> rule: the surface reaches the
//     colour it would have when pressed, so hover and press read as one gesture;
//   - press squashes to TEXT_BUTTON_SCALE_PRESS with the shared spring
//     (friction 6 / tension 300) that <PressableScale> and <IconButton> use;
//   - directional glyphs nudge 4px through <Arrow>, on the same events;
//   - prefers-reduced-motion keeps every state change; it just snaps.
//
// Intents (`tone`):
//   link     primary text action — tints into the IconButton "primary" surface
//   neutral  plain text action / menu row — ink on a neutral chip once lifted
//   danger   destructive text action — error tint plus an underline that sweeps
//            out from the left on hover/focus
//   toggle   state chip — a stronger snap-back pop, and a permanently lifted
//            pill while `active`
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

export interface TextButtonProps
  extends AccessibilityLabelProps,
    AccessibilityHintProps {
  /** Visible label. A plain string doubles as the accessible name. */
  children: React.ReactNode;
  onPress?: () => void;
  /** Semantic colour family. Default "neutral". */
  tone?: TextButtonTone;
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
      duration: TEXT_BUTTON_TRANSITION_MS,
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
  active = false,
  disabled = false,
  icon,
  iconRight,
  iconSize = 16,
  iconColor,
  labelVariant = "buttonLabel",
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

  const setTo = useCallback(
    (next: boolean) => {
      const value = !disabled && next;
      if (hoveredRef.current === value) return;
      hoveredRef.current = value;
      setHovered(value);
    },
    [disabled]
  );

  // A button that becomes disabled while hovered/focused releases the lift,
  // otherwise it would stay stuck in its lifted colour.
  useEffect(() => {
    if (disabled && hoveredRef.current) {
      hoveredRef.current = false;
      setHovered(false);
    }
  }, [disabled]);

  // The arrow rides the very same events as the surface lift.
  const nudge = useArrowNudge({ disabled });

  // A selected toggle reads as "already engaged", like <IconButton active>.
  const lifted = hovered || active;

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
      variant={labelVariant}
      className={cn(
        toneText[tone],
        lifted && toneLiftText[tone],
        transition,
        labelClassName
      )}
    >
      {children}
    </Text>
  );

  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      // Springs come from PressableScale, which already respects
      // prefers-reduced-motion for us.
      scaleOnPress={
        tone === "toggle" ? TEXT_BUTTON_SCALE_POP : TEXT_BUTTON_SCALE_PRESS
      }
      scaleOnHover={TEXT_BUTTON_SCALE_HOVER}
      hitSlop={hitSlop}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={
        accessibilityLabel ??
        (typeof children === "string" ? (children as string) : undefined)
      }
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled, selected: active }}
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
        setTo(true);
      }}
      onBlur={() => {
        nudge.onBlur?.();
        setTo(false);
      }}
      className={cn(
        "flex-row items-center justify-center gap-1.5 rounded-lg",
        transition,
        toneSurface[tone],
        lifted && toneSurfaceLift[tone],
        !disabled && toneSurfacePressed[tone],
        disabled && "opacity-50",
        className
      )}
    >
      {icon ? renderGlyph(icon) : null}
      {tone === "danger" ? (
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
  );
}
