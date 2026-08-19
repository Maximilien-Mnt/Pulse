/** @type {import('tailwindcss').Config} */

// ---------------------------------------------------------------------------
// PULSE DESIGN SYSTEM — Tailwind extension
//
// All values are sourced from src/design-tokens/ to keep a single
// source of truth between Tailwind (web) and React Native (NativeWind).
//
// Dark mode uses the `class` strategy (already in place in app/_layout.tsx).
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-require-imports */
const { semanticColors } = require("./src/design-tokens/semantic/colors");
const { fontSize, fontWeight, lineHeight } = require("./src/design-tokens/primitive/typography");
const { spacing } = require("./src/design-tokens/primitive/spacing");
const { radius } = require("./src/design-tokens/primitive/radius");
const { blue, coral, green, neutral, error, warning } = require("./src/design-tokens/primitive/colors");

module.exports = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // ── Brand (blue) — uses CSS variables for dark mode support ──
        primary: {
          DEFAULT: semanticColors.light.primary,
          dark: semanticColors.dark.primary,
          hover: semanticColors.light["primary-hover"],
          "hover-dark": semanticColors.dark["primary-hover"],
          active: semanticColors.light["primary-active"],
          "active-dark": semanticColors.dark["primary-active"],
          tint: semanticColors.light["primary-tint"],
          "tint-dark": semanticColors.dark["primary-tint"],
        },
        
        // ── Accent (coral) ────────────────────────────────────────
        accent: {
          DEFAULT: semanticColors.light.accent,
          dark: semanticColors.dark.accent,
        },
        coral: coral,

        // ── Success (green) scale ─────────────────────────────────
        green: green,

        // ── Semantic status ───────────────────────────────────────
        success: {
          DEFAULT: semanticColors.light.success,
          dark: semanticColors.dark.success,
        },
        error: {
          DEFAULT: semanticColors.light["error-500"],
          dark: semanticColors.dark["error-500"],
          600: {
            DEFAULT: semanticColors.light["error-600"],
            dark: semanticColors.dark["error-600"],
          },
        },
        warning: {
          DEFAULT: semanticColors.light["warning-500"],
          dark: semanticColors.dark["warning-500"],
          700: {
            DEFAULT: semanticColors.light["warning-700"],
            dark: semanticColors.dark["warning-700"],
          },
        },

        // ── Neutral scale ─────────────────────────────────────────
        neutral: neutral,

        // ── Semantic surfaces / text with dark mode variants ──────
        surface: {
          DEFAULT: semanticColors.light.surface,
          dark: semanticColors.dark.surface,
          card: {
            DEFAULT: semanticColors.light["surface-card"],
            dark: semanticColors.dark["surface-card"],
          },
          overlay: {
            DEFAULT: semanticColors.light["surface-overlay"],
            dark: semanticColors.dark["surface-overlay"],
          },
        },
        
        // ── Background ────────────────────────────────────────────
        bg: {
          DEFAULT: semanticColors.light.bg,
          dark: semanticColors.dark.bg,
        },
        
        // ── Border ────────────────────────────────────────────────
        border: {
          DEFAULT: semanticColors.light.border,
          dark: semanticColors.dark.border,
        },
        
        // ── Text colors with dark mode support ────────────────────
        "text-primary": {
          DEFAULT: semanticColors.light["text-primary"],
          dark: semanticColors.dark["text-primary"],
        },
        "text-secondary": {
          DEFAULT: semanticColors.light["text-secondary"],
          dark: semanticColors.dark["text-secondary"],
        },
        "text-tertiary": {
          DEFAULT: semanticColors.light["text-tertiary"],
          dark: semanticColors.dark["text-tertiary"],
        },
        "text-inverse": {
          DEFAULT: semanticColors.light["text-inverse"],
          dark: semanticColors.dark["text-inverse"],
        },
        
        // ── Disabled states ────────────────────────────────────────
        disabled: {
          bg: {
            DEFAULT: semanticColors.light["disabled-bg"],
            dark: semanticColors.dark["disabled-bg"],
          },
          text: {
            DEFAULT: semanticColors.light["disabled-text"],
            dark: semanticColors.dark["disabled-text"],
          },
        },
      },

      // ── Border radius ───────────────────────────────────────────
      borderRadius: {
        none: "0px",
        xs: `${radius.xs}px`,
        sm: `${radius.sm}px`,
        md: `${radius.md}px`,
        lg: `${radius.lg}px`,
        xl: `${radius.xl}px`,
        full: `${radius.full}px`,
      },

      // ── Spacing ─────────────────────────────────────────────────
      spacing: Object.fromEntries(
        Object.entries(spacing).map(([k, v]) => [k, `${v}px`])
      ),

      // ── Typography ──────────────────────────────────────────────
      fontSize: {
        xs: [fontSize.xs + "px", { lineHeight: lineHeight.tight }],
        sm: [fontSize.sm + "px", { lineHeight: lineHeight.normal }],
        base: [fontSize.base + "px", { lineHeight: lineHeight.normal }],
        md: [fontSize.md + "px", { lineHeight: lineHeight.normal }],
        lg: [fontSize.lg + "px", { lineHeight: lineHeight.relaxed }],
        xl: [fontSize.xl + "px", { lineHeight: lineHeight.snug }],
        "2xl": [fontSize["2xl"] + "px", { lineHeight: lineHeight.snug }],
        "3xl": [fontSize["3xl"] + "px", { lineHeight: lineHeight.tight }],
        "4xl": [fontSize["4xl"] + "px", { lineHeight: lineHeight.tight }],
      },

      fontWeight,

      fontFamily: {
        // Keeping existing Outfit mappings for backward compat
        outfit: ["Outfit_400Regular", "sans-serif"],
        "outfit-medium": ["Outfit_500Medium", "sans-serif"],
        "outfit-semibold": ["Outfit_600SemiBold", "sans-serif"],
        "outfit-bold": ["Outfit_700Bold", "sans-serif"],
        // New Inter + SpaceGrotesk families per design tokens
        inter: ["Inter_400Regular", "sans-serif"],
        "inter-medium": ["Inter_500Medium", "sans-serif"],
        "inter-semibold": ["Inter_600SemiBold", "sans-serif"],
        "inter-bold": ["Inter_700Bold", "sans-serif"],
        "space-grotesk": ["SpaceGrotesk_400Regular", "sans-serif"],
        "space-grotesk-medium": ["SpaceGrotesk_500Medium", "sans-serif"],
        "space-grotesk-bold": ["SpaceGrotesk_700Bold", "sans-serif"],
      },
    },
  },
  plugins: [],
};