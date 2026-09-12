// ---------------------------------------------------------------------------
// PULSE DESIGN SYSTEM — Button
//
// Variants: primary, secondary, ghost, destructive, energy
//
// Usage:
//   <Button variant="primary" icon="add-circle-outline">Create event</Button>
//   <Button variant="destructive" loading>Deleting...</Button>
// ---------------------------------------------------------------------------

import React, { useCallback, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  View,
  Platform,
} from "react-native";
import type { ReactNode } from "react";
import { cn } from "@/utils/format";
import { Text } from "@/components/ui/Text";
import { useThemeStore } from "@/stores/themeStore";
import { Icon, type IconName, type IconColor } from "@/components/ui/Icon";
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

export type ButtonSize = "md" | "lg";

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

/** Height + horizontal padding per size preset. */
const sizeClasses: Record<ButtonSize, string> = {
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
    const scale = useRef(new Animated.Value(1)).current;

    const handlePressIn = useCallback(() => {
      Animated.timing(scale, {
        toValue: 0.98,
        duration: 150,
        useNativeDriver: Platform.OS !== "web",
      }).start();
    }, [scale]);

    const handlePressOut = useCallback(() => {
      Animated.timing(scale, {
        toValue: 1,
        duration: 150,
        useNativeDriver: Platform.OS !== "web",
      }).start();
    }, [scale]);

    const isDisabled = disabled || loading;

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

    const containerClasses = cn(
      "flex-row items-center justify-center gap-2 rounded-md",
      sizeClasses[size],
      // Variant classes
      isDisabled ? disabledClasses : cn(variantBg[variant], variantBorder[variant]),
      // Active state (scale animation handles the press effect on native,
      // web uses active: pseudo-class via NativeWind)
      "active:scale-[0.98]",
      // Focus ring (web) — ring-2 ring-blue-300 ring-offset-2
      // ring classes applied via className for web clients
      className
    );

    const textColor = isDisabled ? disabledText : variantText[variant];
    const iconColor = indicatorColor(variant);

    return (
      <Animated.View style={{ transform: [{ scale }] }}>
        <Pressable
          ref={ref}
          testID={testID}
          accessibilityRole="button"
          accessibilityLabel={effectiveLabel}
          accessibilityHint={effectiveHint}
          accessibilityState={effectiveState}
          accessibilityValue={isDisabled ? undefined : effectiveValue}
          accessible={effectiveLabel != null || effectiveHint != null}
          disabled={isDisabled}
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          className={containerClasses}
        >
          {loading ? (
            <ActivityIndicator color={isDark ? "text-inverse" : iconColor} size="small" />
          ) : icon ? (
            <Icon name={icon} size={20} color={iconColor} />
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
          {iconRight ? <Icon name={iconRight} size={20} color={iconColor} /> : null}
        </Pressable>
      </Animated.View>
    );
  }
);

Button.displayName = "Button";