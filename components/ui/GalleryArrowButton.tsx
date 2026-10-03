// ---------------------------------------------------------------------------
// PULSE DESIGN SYSTEM — GalleryArrowButton
//
// Overlay prev/next arrow shared by every photo carousel (feed media, club
// gallery): same circular hit target, same glyph, same hover/focus nudge.
// Rendered absolutely — position it with the parent (`left-2` / `right-2`
// come from `direction`).
// ---------------------------------------------------------------------------

import React from "react";
import { PressableScale } from "./PressableScale";
import { Arrow, useArrowNudge } from "./Arrow";
import { ICON_BUTTON_SCALE_HOVER, ICON_BUTTON_SCALE_PRESS } from "./IconButton";
import { cn } from "@/utils/format";

export type GalleryArrowDirection = "left" | "right";

export interface GalleryArrowButtonProps {
  /** Which side of the gallery the button sits on (and which way it points). */
  direction: GalleryArrowDirection;
  onPress: () => void;
  /** Renders the arrow inactive (used at the ends of the gallery). */
  disabled?: boolean;
  /** Required screen-reader label ("Photo précédente" / "Photo suivante"). */
  accessibilityLabel: string;
}

export function GalleryArrowButton({
  direction,
  onPress,
  disabled,
  accessibilityLabel,
}: GalleryArrowButtonProps) {
  const { active, ...nudge } = useArrowNudge({ disabled });

  return (
    <PressableScale
      {...nudge}
      onPress={onPress}
      disabled={disabled}
      scaleOnPress={ICON_BUTTON_SCALE_PRESS}
      scaleOnHover={ICON_BUTTON_SCALE_HOVER}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      className={cn(
        "absolute top-1/2 -translate-y-1/2 z-10",
        "w-11 h-11 rounded-full items-center justify-center shadow-sm border", // Standard 44×44 — all circular buttons share this dimension.
        // Hover/focus lifts to the same colour as the pressed state, matching
        // the shared <IconButton> motion language (components/ui/IconButton.tsx).
        "bg-white/90 dark:bg-neutral-900/90 border-neutral-200 dark:border-neutral-700",
        active && "bg-white dark:bg-neutral-800 transition-colors duration-150",
        direction === "left" ? "left-2" : "right-2"
      )}
    >
      <Arrow
        active={active}
        name={direction === "left" ? "ChevronLeft" : "ChevronRight"}
        size={20}
        color="text-primary"
      />
    </PressableScale>
  );
}