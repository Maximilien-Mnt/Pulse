// ---------------------------------------------------------------------------
// PULSE DESIGN SYSTEM — Input
//
// Single-line text input and multi-line textarea with label, help text,
// and error state, all driven by design tokens.
//
// Usage:
//   <Input label="Email" placeholder="you@example.com" />
//   <Input label="Bio" multiline numberOfLines={4} />
//   <Input label="Name" error="Name is required" />
// ---------------------------------------------------------------------------

import React, { useState, useCallback } from "react";
import {
  TextInput as RNTextInput,
  View,
  type TextInputProps as RNTextInputProps,
} from "react-native";
import { cn } from "@/utils/format";
import { Text } from "@/components/ui/Text";
import { useDesignTokens } from "@/src/design-tokens/useDesignTokens";
import type { AccessibilityStateProps } from "@/src/accessibility";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface InputProps extends Omit<RNTextInputProps, "style"> {
  /** Label displayed above the input — also used as the accessible name. */
  label?: string;
  /** Help text displayed below the input — also used as accessible hint. */
  help?: string;
  /** Error message — when set, the border turns error-500, message shows below,
   *  and the field is announced as invalid to assistive technology. */
  error?: string;
  /** Additional Tailwind / NativeWind class names for the container */
  className?: string;
  /** Additional class names for the input itself */
  inputClassName?: string;
  /** Optional element rendered at the trailing edge of the input */
  rightElement?: React.ReactNode;
  /** Test identifier for E2E and unit tests. */
  testID?: string;
}

// ---------------------------------------------------------------------------
// Shared classes
// ---------------------------------------------------------------------------

const baseInput =
  "h-12 rounded-sm border-[1.5px] border-border bg-surface px-4 text-base text-text-primary dark:text-text-primary-dark placeholder:text-text-tertiary font-inter dark:border-border-dark dark:bg-surface-dark";

const focusedInput =
  "border-primary";

const errorInput =
  "border-error-500";

const textareaExtra = "h-auto py-3";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const Input = React.forwardRef<RNTextInput, InputProps>(
  (
    {
      label,
      help,
      error,
      className,
      inputClassName,
      multiline,
      onFocus,
      onBlur,
      rightElement,
      testID,
      ...rest
    },
    ref
  ) => {
    const tokens = useDesignTokens();
    const [isFocused, setIsFocused] = useState(false);

    const handleFocus = useCallback(
      (e: Parameters<NonNullable<RNTextInputProps["onFocus"]>>[0]) => {
        setIsFocused(true);
        onFocus?.(e);
      },
      [onFocus]
    );

    const handleBlur = useCallback(
      (e: Parameters<NonNullable<RNTextInputProps["onBlur"]>>[0]) => {
        setIsFocused(false);
        onBlur?.(e);
      },
      [onBlur]
    );

    const inputClasses = cn(
      baseInput,
      isFocused && !error && focusedInput,
      error && errorInput,
      multiline && textareaExtra,
      !!rightElement && "pr-11",
      inputClassName
    );

    const accessibleName = label;
    const accessibleHint = help;
    const accessibleInvalid = error ? true : undefined;
    const accessibleState = error
      ? { invalid: true, readonly: false }
      : undefined;

    return (
      <View className={cn("gap-2", className)}>
        {/* Label — also serves as the accessible name for the field */}
        {label ? (
          <Text
            variant="caption"
            className="text-text-secondary"
            testID={testID ? `${testID}-label` : undefined}
            accessible
            accessibilityRole="label"
          >
            {label}
          </Text>
        ) : null}

        {/* Input field container */}
        <View className="relative">
          <RNTextInput
            ref={ref}
            testID={testID}
            multiline={multiline}
            textAlignVertical={multiline ? "top" : "center"}
            placeholderTextColor={tokens.colors["text-tertiary"]}
            onFocus={handleFocus}
            onBlur={handleBlur}
            className={inputClasses}
            accessible
            accessibilityLabel={accessibleName}
            accessibilityHint={accessibleHint}
            accessibilityState={accessibleState}
            accessibilityInvalid={accessibleInvalid}
            accessibilityRole="textbox"
            {...rest}
          />
          {rightElement ? (
            <View className="absolute right-2 top-0 bottom-0 justify-center items-center">
              {rightElement}
            </View>
          ) : null}
        </View>

        {/* Help text (only when no error) — also served as accessible hint */}
        {help && !error ? (
          <Text variant="caption" className="text-text-secondary">
            {help}
          </Text>
        ) : null}

        {/* Error message — associated with the field and announced when present.
         *  In a form flow, errors should be surfaced after submit so AT users
         *  hear the validation result. The accessibilityInvalid flag on the
         *  textbox already marks the field; this visible message reinforces it. */}
        {error ? (
          <Text
            variant="caption"
            className="text-error-600"
            testID={testID ? `${testID}-error` : undefined}
            accessible
            accessibilityRole="alert"
            accessibilityLabel={error}
          >
            {error}
          </Text>
        ) : null}
      </View>
    );
  }
);

Input.displayName = "Input";
