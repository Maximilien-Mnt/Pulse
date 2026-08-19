// ---------------------------------------------------------------------------
// PULSE DESIGN SYSTEM — TYPOGRAPHY SCALE
//
// Every text variant in the Pulse design language, defined once.
// Maps to Tailwind classes via tailwind.config.js and consumed
// directly on React Native via useDesignTokens().
// ---------------------------------------------------------------------------

/** Font families used in the Pulse design system */
export const fontFamily = {
  /** Primary display / heading typeface */
  spaceGrotesk: "SpaceGrotesk",
  /** Body / UI typeface */
  inter: "Inter",
} as const;

export type FontFamily = keyof typeof fontFamily;

// ---------------------------------------------------------------------------
// Text variants
// ---------------------------------------------------------------------------

export interface TypographyVariant {
  family: string;
  size: number; // px
  lineHeight: number; // px
  weight: "400" | "500" | "600" | "700";
  tracking?: string; // CSS letter-spacing value (e.g. "-0.02em")
  uppercase?: boolean;
  tabularNums?: boolean;
}

export const typography = {
  display: {
    family: fontFamily.spaceGrotesk,
    size: 34,
    lineHeight: 40,
    weight: "700" as const,
    tracking: "-0.02em",
  },
  h1: {
    family: fontFamily.spaceGrotesk,
    size: 26,
    lineHeight: 32,
    weight: "700" as const,
  },
  h2: {
    family: fontFamily.spaceGrotesk,
    size: 20,
    lineHeight: 26,
    weight: "500" as const,
  },
  subtitle: {
    family: fontFamily.inter,
    size: 17,
    lineHeight: 22,
    weight: "600" as const,
  },
  bodyLarge: {
    family: fontFamily.inter,
    size: 16,
    lineHeight: 24,
    weight: "400" as const,
  },
  body: {
    family: fontFamily.inter,
    size: 14,
    lineHeight: 20,
    weight: "400" as const,
  },
  caption: {
    family: fontFamily.inter,
    size: 12,
    lineHeight: 16,
    weight: "500" as const,
  },
  overline: {
    family: fontFamily.inter,
    size: 11,
    lineHeight: 14,
    weight: "600" as const,
    tracking: "+0.06em",
    uppercase: true,
  },
  buttonLabel: {
    family: fontFamily.inter,
    size: 15,
    lineHeight: 20,
    weight: "600" as const,
  },
  stat: {
    family: fontFamily.spaceGrotesk,
    size: 14, // default — use inline size for specific stats
    lineHeight: 20,
    weight: "500" as const,
    tabularNums: true,
  },
} as const satisfies Record<string, TypographyVariant>;

export type TypographyVariantKey = keyof typeof typography;

// ---------------------------------------------------------------------------
// Flat scales for direct consumption
// ---------------------------------------------------------------------------

/** All unique font sizes used in the system (px) */
export const fontSize = {
  xs: 11,
  sm: 12,
  base: 14,
  md: 15,
  lg: 16,
  xl: 17,
  "2xl": 20,
  "3xl": 26,
  "4xl": 34,
} as const;

export type FontSizeKey = keyof typeof fontSize;

export const fontWeight = {
  regular: "400" as const,
  medium: "500" as const,
  semibold: "600" as const,
  bold: "700" as const,
};

export const lineHeight = {
  tight: 1.2,
  snug: 1.3,
  normal: 1.4,
  relaxed: 1.5,
};