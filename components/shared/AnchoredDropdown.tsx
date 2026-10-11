// ---------------------------------------------------------------------------
// PULSE SHARED — Anchored dropdown
//
// Renders a floating panel *attached* to its trigger: the panel drops straight
// down from the trigger's bottom edge with zero gap, so a same-coloured panel
// and trigger read as one continuous body (no border, no space between them).
// The trigger itself stays in normal layout flow, so sibling header controls
// keep their usual spacing — only this button gains the hanging panel.
//
// This component is intentionally presentation-agnostic: it owns the anchoring
// (absolute, right-aligned, clamped to the viewport), the rounded surface and
// the elevation, while the panel content supplies its own background colour so
// it can match whichever trigger opened it.
// ---------------------------------------------------------------------------

import type { ReactNode } from "react";
import { View, useWindowDimensions } from "react-native";

import { cn } from "@/utils/format";

/** Minimum margin kept between the panel and any screen edge. */
const EDGE = 16;
/** Preferred panel width; always clamped down to fit narrow screens. */
const DEFAULT_WIDTH = 360;

export type AnchoredDropdownProps = {
  /** The trigger element (e.g. an icon button). Rendered in normal flow. */
  trigger: ReactNode;
  /** The floating panel content, mounted only while `open`. */
  children: ReactNode;
  /** Whether the panel is visible. */
  open: boolean;
  /** Preferred panel width; clamped to `windowWidth - EDGE * 2`. */
  width?: number;
  /** Extra classes merged onto the panel surface (rounding/shadow live here). */
  className?: string;
  testID?: string;
};

export function AnchoredDropdown({
  trigger,
  children,
  open,
  width,
  className,
  testID,
}: AnchoredDropdownProps) {
  const { width: windowWidth } = useWindowDimensions();
  const panelWidth = Math.min(width ?? DEFAULT_WIDTH, windowWidth - EDGE * 2);

  return (
    <View className="relative shrink-0">
      {trigger}
      {open ? (
        <View
          testID={testID}
          style={[{ width: panelWidth }, { top: "100%" }]}
          className={cn(
            "absolute right-0 z-50 rounded-2xl overflow-hidden shadow-lg dark:shadow-none",
            className
          )}
        >
          {children}
        </View>
      ) : null}
    </View>
  );
}
