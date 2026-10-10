// ---------------------------------------------------------------------------
// PULSE DESIGN SYSTEM — Button
//
// Variants: primary, secondary, ghost, destructive, energy
//
// Usage:
//   <Button variant="primary" icon="add-circle-outline">Create event</Button>
//   <Button variant="destructive" loading>Deleting...</Button>
// ---------------------------------------------------------------------------

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  View,
  Platform,
} from "react-native";
import type { ReactNode } from "react";
import { cn } from "@/utils/format";
import { Text } from "@/components/ui/Text";
import { useThemeStore } from "@/stores/themeStore";
import { Icon, type IconName, type IconColor } from "@/components/ui/Icon";
import { Arrow, isArrowIcon, useArrowNudge } from "@/components/ui/Arrow";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import {
  type AccessibilityLabelProps,
  type AccessibilityHintProps,
  type AccessibilityStateProps,
  type AccessibilityValueProps,
} from "@/src/accessibility";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "destructive"
  | "energy";

export type ButtonSize = "sm" | "md" | "lg";

// ---------------------------------------------------------------------------
// Shared label-button motion tokens
//
// One calm gesture family for every control whose action is a word rather
// than a glyph: <Button>, <TextButton> and the icon controls all engage on
// hover/focus (surface reaches its pressed colour over the same 150ms fade —
// see ICON_BUTTON_* for the round-surface twin) and dip on press. Labels
// never scale: no grow on hover/focus, no squash on press — the press
// feedback is the `active:` surface tint plus a subtle opacity dip, so
// short labels ("S'inscrire", "Enregistrer") never shimmer or reflow.
// Button icons DO grow in place on hover/focus (BUTTON_ICON_SCALE_HOVER)
// while the label stays flat.
// ---------------------------------------------------------------------------

/**
 * Hover / keyboard-focus engagement for labels. Labels never grow, so this
 * stays at 1 — hover/focus feedback is the surface/colour engagement only.
 * Kept exported for backward-compat imports.
 */
export const BUTTON_SCALE_HOVER = 1;

/** Labels never squash on press — the feedback is surface + opacity. Kept for compat. */
export const BUTTON_SCALE_PRESS = 1;

/** Icon glyph scale while hovered / keyboard-focused — grows in place, label stays flat. */
export const BUTTON_ICON_SCALE_HOVER = 1.15;

/** Shared colour-fade duration (same as ICON_BUTTON_TRANSITION_MS / ARROW_NUDGE_DURATION). */
export const BUTTON_TRANSITION_MS = 150;

export interface ButtonProps
  extends AccessibilityLabelProps,
    AccessibilityHintProps,
    AccessibilityStateProps,
    AccessibilityValueProps {
  children?: ReactNode;
  /** Legacy label prop — kept for backward compatibility with existing call sites. */
  title?: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  /** Icon name from the Pulse icon set placed before the label */
  icon?: IconName;
  /** Icon name from the Pulse icon set placed after the label (e.g. a forward arrow) */
  iconRight?: IconName;
  /** Button size preset. "lg" renders a taller, slightly wider button. Defaults to "md". */
  size?: ButtonSize;
  /** Additional Tailwind / NativeWind class names */
  className?: string;
  /** Raw RN accessibility state (merged with the derived disabled state). */
  accessibilityState?: {
    disabled?: boolean;
    selected?: boolean;
    checked?: boolean | "mixed";
    busy?: boolean;
    expanded?: boolean;
  };
  /** Test identifier for E2E and unit tests. */
  testID?: string;
}

// ---------------------------------------------------------------------------
// Variant → styling maps
// ---------------------------------------------------------------------------

const variantBg: Record<ButtonVariant, string> = {
  primary: "bg-primary dark:bg-primary-dark",
  secondary: "bg-transparent",
  ghost: "bg-transparent",
  destructive: "bg-error-600 dark:bg-error-dark",
  energy: "bg-coral-600 dark:bg-coral-dark",
};

const variantBorder: Record<ButtonVariant, string> = {
  primary: "",
  secondary: "border-[1.5px] border-primary dark:border-primary-dark",
  ghost: "",
  destructive: "",
  energy: "",
};

const variantText: Record<ButtonVariant, string> = {
  primary: "text-white dark:text-text-inverse",
  secondary: "text-primary dark:text-primary-dark",
  ghost: "text-primary dark:text-primary-dark",
  destructive: "text-white dark:text-text-inverse",
  energy: "text-white dark:text-text-inverse",
};

/**
 * Surface reached on hover / keyboard focus.
 *
 * Deliberately the same colour sequence as the pressed `active:` state (the
 * <IconButton> rule): crossing the button with the pointer and then pressing it
 * reads as one continuous gesture instead of two affordances.
 */
const variantLiftBg: Record<ButtonVariant, string> = {
  primary: "bg-primary-hover dark:bg-primary-hover-dark",
  secondary: "bg-primary/10 dark:bg-primary-dark/15",
  ghost: "bg-primary/10 dark:bg-primary-dark/15",
  destructive: "bg-error-600/85 dark:bg-error-dark/85",
  energy: "bg-coral-700 dark:bg-coral-800",
};

/** Pressed surface — the lifted colours under the `active:` pseudo-class, so a
 *  touch press (which never hovers) animates identically. */
const variantPressBg: Record<ButtonVariant, string> = {
  primary: "active:bg-primary-hover dark:active:bg-primary-hover-dark",
  secondary: "active:bg-primary/10 dark:active:bg-primary-dark/15",
  ghost: "active:bg-primary/10 dark:active:bg-primary-dark/15",
  destructive: "active:bg-error-600/85 dark:active:bg-error-dark/85",
  energy: "active:bg-coral-700 dark:active:bg-coral-800",
};

/** Label colour reached on hover/focus — only the transparent variants change. */
const variantLiftText: Record<ButtonVariant, string> = {
  primary: "",
  secondary: "text-primary-hover dark:text-primary-hover-dark",
  ghost: "text-primary-hover dark:text-primary-hover-dark",
  destructive: "",
  energy: "",
};

/** Height + horizontal padding per size preset. */
const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 px-4",
  md: "h-12 px-[22px]",
  lg: "h-14 px-6",
};

/** Returns the icon / ActivityIndicator color for a given variant */
function indicatorColor(variant: ButtonVariant): IconColor {
  return variant === "secondary" || variant === "ghost" ? "primary" : "text-inverse";
}

const disabledClasses = "bg-disabled-bg dark:bg-disabled-bg border-0";
const disabledText = "text-disabled-text dark:text-disabled-text";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const Button = React.forwardRef<View, ButtonProps>(
  (
    {
      children,
      title,
      onPress,
      variant = "primary",
      disabled = false,
      loading = false,
      icon,
      iconRight,
      size = "md",
      className,
      accessibilityLabel,
      accessibilityHint,
      accessibilityStateDisabled,
      accessibilityState,
      accessibilityValue,
      testID,
    },
    ref
  ) => {
    const isDark = useThemeStore((s) => s.isDark);
    const reduceMotion = useReducedMotion();
    const [lifted, setLifted] = useState(false);
    const liftedRef = useRef(false);
    const pressedRef = useRef(false);

    const isDisabled = disabled || loading;

    // ── Motion ─────────────────────────────────────────────────────────
    // Labels never scale: hover/focus/press feedback is the surface + label
    // colour engagement over the shared 150ms fade, plus the `active:`
    // pressed surface and a subtle opacity dip. The wrapper below stays at
    // scale 1 (no spring) so labels never shimmer or reflow.
    const [pressed, setPressed] = useState(false);
    // Hover is a pointer concept (web only); keyboard focus gets the same
    // affordance on every platform — the rule shared by <IconButton> and
    // useArrowNudge, so the arrow and the surface never disagree.
    const setTo = useCallback(
      (next: boolean) => {
        const value = !isDisabled && next;
        if (liftedRef.current === value) return;
        liftedRef.current = value;
        setLifted(value);
      },
      [isDisabled]
    );

    // A button that becomes disabled while hovered/focused releases the lift,
    // otherwise it would stay stuck in its lifted colour.
    useEffect(() => {
      if (isDisabled && liftedRef.current) {
        liftedRef.current = false;
        setLifted(false);
      }
    }, [isDisabled]);

    // ── Icon grow ────────────────────────────────────────────────────────
    // On hover/focus the leading/trailing glyph grows in place (same 150ms
    // ease-out as the surface fade, mirroring SendButton's glyph scale).
    // Labels never scale — only this icon wrapper transforms.
    const iconScale = useRef(new Animated.Value(1)).current;
    useEffect(() => {
      const to = lifted ? BUTTON_ICON_SCALE_HOVER : 1;
      if (reduceMotion) {
        iconScale.setValue(to);
        return;
      }
      Animated.timing(iconScale, {
        toValue: to,
        duration: BUTTON_TRANSITION_MS,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    }, [lifted, reduceMotion, iconScale]);

    const handlePressIn = useCallback(() => {
      pressedRef.current = true;
      setPressed(true);
    }, []);

    const handlePressOut = useCallback(() => {
      pressedRef.current = false;
      setPressed(false);
    }, []);

    // Shared arrow micro-interaction: arrow icons (Chevron/Arrow ←→) nudge
    // on hover/focus like every other arrow button in the app.
    const { active: arrowActive, ...arrowNudge } = useArrowNudge({ disabled: isDisabled });

    // Build accessibility props. User-provided values take precedence; when
    // absent we synthesize sensible defaults from visible content so that AT
    // still gets a meaningful announcement without requiring every call site
    // to pass a label.
    const effectiveLabel =
      accessibilityLabel ??
      (title ??
        (typeof children === "string" ? (children as string) : undefined));

    const effectiveState = {
      disabled: isDisabled || accessibilityStateDisabled,
      ...(accessibilityState && !isDisabled && !accessibilityStateDisabled
        ? accessibilityState
        : {}),
    };

    const effectiveHint = accessibilityHint;
    const effectiveValue = accessibilityValue;

    const containerClasses = cn(
      "flex-row items-center justify-center gap-2 rounded-md",
      sizeClasses[size],
      // Variant classes. On hover/focus the surface lifts to the colour it
      // already reaches when pressed, so hover and press read as one gesture.
      isDisabled
        ? disabledClasses
        : cn(
            variantBg[variant],
            variantBorder[variant],
            lifted && variantLiftBg[variant]
          ),
      // Pressed surface — same colours, under `active:` so touch presses (which
      // never hover) animate identically. Pressed opacity dip adds tactile
      // feedback without any transform.
      !isDisabled && variantPressBg[variant],
      !isDisabled && pressed && "opacity-80",
      !isDisabled && "active:opacity-80",
      // The 150ms colour fade that turns the surface swap into an animation.
      // Dropped under reduced motion: the state still changes, it just snaps.
      !reduceMotion && "transition-colors",
      "duration-150",
      // Focus ring (web) — ring-2 ring-blue-300 ring-offset-2
      // ring classes applied via className for web clients
      className
    );

    const textColor = cn(
      isDisabled ? disabledText : variantText[variant],
      !isDisabled && lifted && variantLiftText[variant],
      !reduceMotion && "transition-colors",
      "duration-150"
    );
    const iconColor = indicatorColor(variant);

    const renderIcon = (name: IconName) => (
      <Animated.View
        testID="button-icon-scale"
        style={{ transform: [{ scale: iconScale }] }}
      >
        {isArrowIcon(name) ? (
          <Arrow active={arrowActive} name={name} size={20} color={iconColor} />
        ) : (
          <Icon name={name} size={20} color={iconColor} />
        )}
      </Animated.View>
    );

    return (
      <Pressable
        ref={ref}
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={effectiveLabel}
        accessibilityHint={effectiveHint}
        accessibilityState={effectiveState}
        accessibilityValue={
          isDisabled || effectiveValue == null ? undefined : { text: effectiveValue }
        }
        accessible={effectiveLabel != null || effectiveHint != null}
        disabled={isDisabled}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        // Pointer hover (web only) and keyboard focus (every platform) lift
        // the button; the arrow rides the very same events so the glyph and
        // the surface can never disagree about whether it is engaged.
        onHoverIn={
          Platform.OS === "web"
            ? () => {
                arrowNudge.onHoverIn?.();
                setTo(true);
              }
            : undefined
        }
        onHoverOut={
          Platform.OS === "web"
            ? () => {
                arrowNudge.onHoverOut?.();
                setTo(false);
              }
            : undefined
        }
        onFocus={() => {
          arrowNudge.onFocus?.();
          setTo(true);
        }}
        onBlur={() => {
          arrowNudge.onBlur?.();
          setTo(false);
        }}
        className={containerClasses}
      >
        {loading ? (
          <ActivityIndicator color={isDark ? "text-inverse" : iconColor} size="small" />
        ) : icon ? (
          renderIcon(icon)
        ) : null}
        {title != null ? (
          <Text variant="buttonLabel" className={textColor}>
            {title}
          </Text>
        ) : typeof children === "string" ? (
          <Text variant="buttonLabel" className={textColor}>
            {children}
          </Text>
        ) : (
          children
        )}
        {iconRight ? renderIcon(iconRight) : null}
      </Pressable>
    );
  }
);

Button.displayName = "Button";