// ---------------------------------------------------------------------------
// PULSE DESIGN SYSTEM — SEMANTIC COLOR TOKENS (LIGHT / DARK)
//
// These tokens consume the primitive color scales and provide context-aware
// values for backgrounds, surfaces, texts, borders, and brand colors.
//
// Usage:
//   import { semanticColors } from "@/design-tokens/semantic/colors";
//   const isDark = useThemeStore((s) => s.isDark);
//   const tokens = semanticColors[isDark ? "dark" : "light"];
// ---------------------------------------------------------------------------

import { blue, coral, green, neutral, error, warning } from "../primitive/colors";

export const semanticColors = {
  light: {
    // Backgrounds
    bg: neutral[25],
    surface: neutral[0],
    border: neutral[100],

    // Text hierarchy
    "text-primary": neutral[900],
    "text-secondary": neutral[600],
    "text-tertiary": neutral[400],
    "text-inverse": neutral[0], // white — used on dark/brand backgrounds

    // Brand
    primary: blue[500],
    "primary-hover": blue[600],
    "primary-active": blue[700],
    "primary-tint": blue[50],

    // Semantic
    success: green[500],
    "error-500": error[500],
    "error-600": error[600],
    "warning-500": warning[500],
    "warning-700": warning[700],
    accent: coral[500],
  },
  dark: {
    // Backgrounds — custom values per the spec
    bg: "#0E1015",
    surface: "#171A20",
    border: "#262A32",

    // Text hierarchy
    "text-primary": "#F5F6F8",
    "text-secondary": "#A7ACB5",
    "text-tertiary": "#767C87",
    "text-inverse": "#14161A", // dark neutral-900 — inverted for dark mode

    // Brand
    primary: blue[400],
    "primary-hover": blue[300],
    "primary-active": "#7A9CFF",
    "primary-tint": "#182240",

    // Semantic
    success: green[500],
    "error-500": error[500],
    "error-600": error[600],
    "warning-500": warning[500],
    "warning-700": warning[700],
    accent: coral[500],
    
    // Additional semantic colors for components
    "surface-overlay": "#262A32",
    "surface-card": "#1E2128",
    "disabled-bg": "#2A2F3A",
    "disabled-text": "#5A6070",
  },
} as const;

export type SemanticColorKey = keyof typeof semanticColors.light;
