// ---------------------------------------------------------------------------
// PULSE DESIGN SYSTEM — Tag / Badge / Chip
//
// Two families:
//   1. "chip" — filter pill, rounded-full, togglable active state
//   2. "status" — semantic status badge (success, warning, error, info, neutral)
//
// Usage:
//   <Tag variant="chip" active>Football</Tag>
//   <Tag variant="status" tone="success">Active</Tag>
// ---------------------------------------------------------------------------

import React from "react";
import { View } from "react-native";
import type { ReactNode } from "react";
import { cn } from "@/utils/format";
import { Text } from "@/components/ui/Text";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TagVariant = "chip" | "status";

export type StatusTone = "success" | "warning" | "error" | "info" | "neutral";

export type TagSize = "sm" | "md";

export interface TagProps {
  children: ReactNode;
  /** "chip" = filter pill, "status" = semantic badge */
  variant?: TagVariant;
  /** Only relevant for "chip" variant — whether the filter is selected */
  active?: boolean;
  /** Only relevant for "status" variant — semantic tone */
  tone?: StatusTone;
  /** Compact size for dense layouts (defaults to "md") */
  size?: TagSize;
  /** Additional class names */
  className?: string;
}

// ---------------------------------------------------------------------------
// Status tone → background + text color
// Matches spec: tinted bg + dark text of same hue, never solid bg + white
// ---------------------------------------------------------------------------

const statusClasses: Record<StatusTone, { bg: string; text: string }> = {
  success: {
    bg: "bg-green-50",
    text: "text-green-700",
  },
  warning: {
    bg: "bg-amber-50",
    text: "text-warning-700",
  },
  error: {
    bg: "bg-red-50",
    text: "text-error-600",
  },
  info: {
    bg: "bg-blue-50",
    text: "text-primary-active",
  },
  neutral: {
    bg: "bg-neutral-100",
    text: "text-neutral-600",
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Chips — "sm" is a compact pill for dense tag clouds, "md" is the default
// ---------------------------------------------------------------------------

const chipSizeClasses: Record<TagSize, string> = {
  sm: "px-2.5 py-1",
  md: "px-4 py-2",
};

export const Tag = React.forwardRef<View, TagProps>(
  ({ children, variant = "chip", active = false, tone = "neutral", size = "md", className }, ref) => {
    if (variant === "status") {
      const toneStyle = statusClasses[tone];
      return (
        <View
          ref={ref}
          className={cn(
            "self-start rounded-sm px-3 py-1",
            toneStyle.bg,
            className
          )}
        >
          <Text variant="caption" className={toneStyle.text}>
            {children}
          </Text>
        </View>
      );
    }

    // chip variant
    return (
      <View
        ref={ref}
        className={cn(
          "self-start rounded-full",
          chipSizeClasses[size],
          active ? "bg-primary dark:bg-primary-dark" : "bg-neutral-50 dark:bg-neutral-800",
          className
        )}
      >
        <Text
          variant="caption"
          className={active ? "text-white dark:text-text-inverse" : "text-text-secondary"}
        >
          {children}
        </Text>
      </View>
    );
  }
);

Tag.displayName = "Tag";