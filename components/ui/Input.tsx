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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface InputProps extends Omit<RNTextInputProps, "style"> {
  /** Label displayed above the input */
  label?: string;
  /** Help text displayed below the input */
  help?: string;
  /** Error message — when set, the border turns error-500 and message shows below */
  error?: string;
  /** Additional Tailwind / NativeWind class names for the container */
  className?: string;
  /** Additional class names for the input itself */
  inputClassName?: string;
  /** Optional element rendered at the trailing edge of the input */
  rightElement?: React.ReactNode;
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

    return (
      <View className={cn("gap-2", className)}>
        {/* Label */}
        {label ? (
          <Text variant="caption" className="text-text-secondary">
            {label}
          </Text>
        ) : null}

        {/* Input field container */}
        <View className="relative">
          <RNTextInput
            ref={ref}
            multiline={multiline}
            textAlignVertical={multiline ? "top" : "center"}
            placeholderTextColor={tokens.colors["text-tertiary"]}
            onFocus={handleFocus}
            onBlur={handleBlur}
            className={inputClasses}
            {...rest}
          />
          {rightElement ? (
            <View className="absolute right-2 top-0 bottom-0 justify-center items-center">
              {rightElement}
            </View>
          ) : null}
        </View>

        {/* Help text (only when no error) */}
        {help && !error ? (
          <Text variant="caption" className="text-text-secondary">
            {help}
          </Text>
        ) : null}

        {/* Error message */}
        {error ? (
          <Text variant="caption" className="text-error-600">
            {error}
          </Text>
        ) : null}
      </View>
    );
  }
);

Input.displayName = "Input";