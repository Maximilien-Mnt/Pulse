// ---------------------------------------------------------------------------
// PULSE DESIGN SYSTEM — PRIMITIVE COLOR SCALES
//
// These scales are the single source of truth for all colors in the app.
// Never hardcode hex values in components — import from here or use the
// semantic tokens (semantic/colors.ts).
// ---------------------------------------------------------------------------

export const blue = {
  50: "#EEF2FF",
  100: "#DCE6FF",
  200: "#B9CDFF",
  300: "#8FACFF",
  400: "#5C82FF",
  500: "#3358FF",
  600: "#2542DB",
  700: "#1B32AD",
  800: "#142480",
  900: "#0D1852",
} as const;

export const coral = {
  50: "#FFF1EC",
  100: "#FFDED2",
  200: "#FFBBA3",
  300: "#FF9670",
  400: "#FF7850",
  500: "#FF5A36",
  600: "#E14A26",
  700: "#B83A1B",
  800: "#8C2C14",
  900: "#5E1D0C",
} as const;

export const green = {
  50: "#E7FAF1",
  100: "#C9F4DF",
  200: "#93E8C0",
  300: "#5CDBA1",
  400: "#2ED191",
  500: "#17C982",
  600: "#0FA36A",
  700: "#0E7A54",
  800: "#0A5B3F",
  900: "#073E2B",
} as const;

export const neutral = {
  0: "#FFFFFF",
  25: "#FAFAFB",
  50: "#F4F5F7",
  100: "#E8EAED",
  200: "#D3D6DC",
  300: "#B0B4BD",
  400: "#888D97",
  500: "#666B76",
  600: "#4A4F59",
  700: "#33373F",
  800: "#23262C",
  900: "#14161A",
} as const;

export const error = {
  500: "#E5484D",
  600: "#C7222D",
} as const;

export const warning = {
  500: "#F5A524",
  700: "#8A5A0A",
} as const;

// Convenience: all primitive scales in one object
export const primitiveColors = {
  blue,
  coral,
  green,
  neutral,
  error,
  warning,
} as const;

export type BlueScale = keyof typeof blue;
export type CoralScale = keyof typeof coral;
export type GreenScale = keyof typeof green;
export type NeutralScale = keyof typeof neutral;
export type ErrorScale = keyof typeof error;
export type WarningScale = keyof typeof warning;