// ---------------------------------------------------------------------------
// PULSE DESIGN SYSTEM — SPACING SCALE
//
// Aligned on the default Tailwind 4px unit. No arbitrary values outside
// this list should be used for margins, paddings, or gaps.
// ---------------------------------------------------------------------------

export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
  24: 96,
} as const;

export type SpacingKey = keyof typeof spacing;