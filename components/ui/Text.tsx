// ---------------------------------------------------------------------------
// PULSE DESIGN SYSTEM — Typed Text component
//
// Replaces ad-hoc <Text className="text-base font-semibold …"> with a single
// variant prop that pulls values from the design tokens.
//
// Usage:
//   <Text variant="display">Hello</Text>
//   <Text variant="body">Default body text</Text>
//   <Text variant="caption" className="text-error-500">Error label</Text>  // overrides ok
// ---------------------------------------------------------------------------

import React from "react";
import { Text as RNText, type TextProps as RNTextProps } from "react-native";
import { cn } from "@/utils/format";
import type { TypographyVariantKey } from "@/src/design-tokens/primitive/typography";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type TextVariant = TypographyVariantKey;

export interface TextProps extends Omit<RNTextProps, "style"> {
  /** Typographic variant from design tokens. Defaults to "body". */
  variant?: TextVariant;
  /** Additional Tailwind / NativeWind class names (merged after variant). */
  className?: string;
  /**
   * Optional inline style — applied AFTER className by React Native, so it
   * deterministically overrides class-based colors even when a theme-driven
   * utility loses the Tailwind cascade (e.g. a bg-overridden Button label).
   */
  style?: RNTextProps["style"];
}

// ---------------------------------------------------------------------------
// Variant → Tailwind classes
//
// NativeWind already knows these values via tailwind.config.js extend.
// We map the design token variant to a set of Tailwind utility classes.
// ---------------------------------------------------------------------------

const VARIANT_CLASSES: Record<TextVariant, string> = {
  display:
    "font-space-grotesk-bold text-4xl tracking-[-0.02em] text-text-primary dark:text-text-primary-dark",
  h1: "font-space-grotesk-bold text-3xl text-text-primary dark:text-text-primary-dark",
  h2: "font-space-grotesk-medium text-2xl text-text-primary dark:text-text-primary-dark",
  subtitle:
    "font-inter-semibold text-xl text-text-primary dark:text-text-primary-dark",
  bodyLarge:
    "font-inter text-lg text-text-primary dark:text-text-primary-dark",
  body: "font-inter text-base text-text-primary dark:text-text-primary-dark",
  caption:
    "font-inter-medium text-sm text-text-secondary dark:text-text-secondary-dark",
  overline:
    "font-inter-semibold text-xs tracking-[+0.06em] uppercase text-text-tertiary dark:text-text-tertiary-dark",
  buttonLabel:
    "font-inter-semibold text-md text-text-primary dark:text-text-primary-dark",
  stat: "font-space-grotesk-medium text-base text-text-primary dark:text-text-primary-dark",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Pulse typed text component.
 *
 * Always specify `variant` for semantic meaning; the component applies
 * the matching Tailwind classes from the design tokens.
 *
 * You may still pass additional `className` overrides (e.g. color, margin).
 */
export const Text = React.forwardRef<RNText, TextProps>(
  ({ variant = "body", className, ...rest }, ref) => {
    const base = VARIANT_CLASSES[variant];
    return <RNText ref={ref} className={cn(base, className)} {...rest} />;
  }
);

Text.displayName = "Text";

// ---------------------------------------------------------------------------
// Named convenience exports (optional sugar)
// ---------------------------------------------------------------------------

export const Display = React.forwardRef<RNText, TextProps>(
  (props, ref) => <Text ref={ref} variant="display" {...props} />
);
Display.displayName = "Display";

export const H1 = React.forwardRef<RNText, TextProps>(
  (props, ref) => <Text ref={ref} variant="h1" {...props} />
);
H1.displayName = "H1";

export const H2 = React.forwardRef<RNText, TextProps>(
  (props, ref) => <Text ref={ref} variant="h2" {...props} />
);
H2.displayName = "H2";

export const Subtitle = React.forwardRef<RNText, TextProps>(
  (props, ref) => <Text ref={ref} variant="subtitle" {...props} />
);
Subtitle.displayName = "Subtitle";

export const BodyLarge = React.forwardRef<RNText, TextProps>(
  (props, ref) => <Text ref={ref} variant="bodyLarge" {...props} />
);
BodyLarge.displayName = "BodyLarge";

export const Body = React.forwardRef<RNText, TextProps>(
  (props, ref) => <Text ref={ref} variant="body" {...props} />
);
Body.displayName = "Body";

export const Caption = React.forwardRef<RNText, TextProps>(
  (props, ref) => <Text ref={ref} variant="caption" {...props} />
);
Caption.displayName = "Caption";

export const Overline = React.forwardRef<RNText, TextProps>(
  (props, ref) => <Text ref={ref} variant="overline" {...props} />
);
Overline.displayName = "Overline";

export const ButtonLabel = React.forwardRef<RNText, TextProps>(
  (props, ref) => <Text ref={ref} variant="buttonLabel" {...props} />
);
ButtonLabel.displayName = "ButtonLabel";

export const Stat = React.forwardRef<RNText, TextProps>(
  (props, ref) => <Text ref={ref} variant="stat" {...props} />
);
Stat.displayName = "Stat";