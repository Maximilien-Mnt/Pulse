// ---------------------------------------------------------------------------
// PULSE SHARED — Anchored dropdown
//
// Full-width in-flow dropdown surface.
//
// The trigger stays in normal layout flow. When `open` is true the panel body is
// mounted as a block-level element that reserves layout space and spans the full
// width of its parent, so it:
//
//   - always shows (no clipping behind other screen elements),
//   - collapses entirely when closed (responsive open/close; no shift when the
//     filter/sort sections in the panel are opened or closed),
//   - is the same grey as the filter/sort button, flush with the button's bottom
//     edge (no border, no gap).
//
// The panel is intentionally NOT absolutely positioned and carries no `z-50`,
// so its z-order follows the normal layout order (it renders above the content
// that comes after it in the tree).
// ---------------------------------------------------------------------------

import type { ReactNode } from "react";
import { View } from "react-native";

import { cn } from "@/utils/format";

export type AnchoredDropdownProps = {
  /** The trigger element (e.g. an icon button). Rendered in normal flow. */
  trigger: ReactNode;
  /** The panel content, mounted only while `open`. */
  children: ReactNode;
  /** Whether the panel is visible. */
  open: boolean;
  /** Extra classes merged onto the panel surface. */
  className?: string;
  testID?: string;
};

export function AnchoredDropdown({
  trigger,
  children,
  open,
  className,
  testID,
}: AnchoredDropdownProps) {
  return (
    <View className="w-full relative">
      {trigger}
      {open ? (
        <View
          testID={testID}
          className={cn(
            // Same grey as the feed/explore filter/sort buttons; rounded; no
            // border so it reads as one continuous body with the button.
            "bg-neutral-100 dark:bg-neutral-800 rounded-2xl overflow-hidden shadow-lg dark:shadow-none",
            className
          )}
        >
          {children}
        </View>
      ) : null}
    </View>
  );
}
