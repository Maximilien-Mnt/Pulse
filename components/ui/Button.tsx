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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "destructive"
  | "energy";

export interface ButtonProps {
  children?: ReactNode;
  /** Legacy label prop — kept for backward compatibility with existing call sites. */
  title?: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  /** Icon name from the Pulse icon set placed before the label */
  icon?: IconName;
  /** Additional Tailwind / NativeWind class names */
  className?: string;
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
      className,
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

    const containerClasses = cn(
      "flex-row items-center justify-center gap-2 rounded-md h-12 px-[22px]",
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
          accessibilityRole="button"
          accessibilityState={{ disabled: isDisabled }}
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
        </Pressable>
      </Animated.View>
    );
  }
);

Button.displayName = "Button";