// ---------------------------------------------------------------------------
// PULSE DESIGN SYSTEM — React Hook
//
// Provides the active design tokens for the current color scheme.
// Consumes useThemeStore (Zustand) to resolve light vs dark mode.
//
// Usage:
//   const tokens = useDesignTokens();
//   <Ionicons color={tokens.colors.primary} />
//   <View style={{ padding: tokens.spacing[4] }} />
// ---------------------------------------------------------------------------

import { useMemo } from "react";
import { useThemeStore } from "@/stores/themeStore";
import { semanticColors } from "./semantic/colors";
import { fontSize, fontWeight, lineHeight, typography, fontFamily } from "./primitive/typography";
import { spacing } from "./primitive/spacing";
import { radius } from "./primitive/radius";

export function useDesignTokens() {
  const isDark = useThemeStore((s) => s.isDark);

  return useMemo(() => {
    const mode = isDark ? "dark" : "light";

    return {
      /** Current mode string ("light" | "dark") */
      mode,
      /** Semantic color tokens for the active mode */
      colors: semanticColors[mode],

      // Typography
      /** All typography variant definitions */
      typography,
      /** Font families (spaceGrotesk, inter) */
      fontFamily,
      /** Flat font-size scale (px) */
      fontSize,
      fontWeight,
      lineHeight,

      // Layout
      /** Spacing scale (px), aligned to 4px unit */
      spacing,
      /** Border-radius scale (px) */
      radius,
    };
  }, [isDark]);
}