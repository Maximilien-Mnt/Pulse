// ---------------------------------------------------------------------------
// PULSE DESIGN SYSTEM — Main entry point
//
// Re-exports all tokens for direct consumption in React Native
// (non-Tailwind contexts like Ionicons colors, ActivityIndicator, etc.).
//
// For Tailwind: see tailwind.config.js which imports from the same sources.
// For React components: import { useDesignTokens } from "@/design-tokens/useDesignTokens"
// ---------------------------------------------------------------------------

// Primitive scales
export {
  blue,
  coral,
  green,
  neutral,
  error,
  warning,
  primitiveColors,
} from "./primitive/colors";
export type {
  BlueScale,
  CoralScale,
  GreenScale,
  NeutralScale,
  ErrorScale,
  WarningScale,
} from "./primitive/colors";

export {
  typography,
  fontFamily,
  fontSize,
  fontWeight,
  lineHeight,
} from "./primitive/typography";
export type { TypographyVariant, TypographyVariantKey, FontSizeKey } from "./primitive/typography";

export { spacing } from "./primitive/spacing";
export type { SpacingKey } from "./primitive/spacing";

export { radius } from "./primitive/radius";
export type { RadiusKey } from "./primitive/radius";

// Semantic tokens
export { semanticColors } from "./semantic/colors";
export type { SemanticColorKey } from "./semantic/colors";

// React hook
export { useDesignTokens } from "./useDesignTokens";