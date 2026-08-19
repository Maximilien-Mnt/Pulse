// ---------------------------------------------------------------------------
// PULSE DESIGN SYSTEM — Card
//
// Generic container shell with surface background, border, and padding,
// with optional shadow in light mode only.
//
// Usage:
//   <Card>Content</Card>
//   <Card onPress={() => navigate()}>Tappable card</Card>
// ---------------------------------------------------------------------------

import React from "react";
import { Pressable, View, Platform } from "react-native";
import type { ReactNode } from "react";
import { cn } from "@/utils/format";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CardProps {
  children: ReactNode;
  /** When provided, the card becomes a Pressable */
  onPress?: () => void;
  /** Additional Tailwind / NativeWind class names */
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const Card = React.forwardRef<View, CardProps>(
  ({ children, onPress, className }, ref) => {
    // base: surface bg, 1px border, radius lg (16), padding 16
    // shadow-sm only in light mode (dark mode relies on border visibility)
    const baseClasses =
      "bg-surface dark:bg-surface-dark rounded-lg border border-border dark:border-border-dark p-4 shadow-sm dark:shadow-none overflow-hidden";

    const combined = cn(baseClasses, className);

    if (onPress) {
      // On web, avoid native driver animations that cause warnings
      const pressableClasses = Platform.OS === "web" 
        ? combined 
        : cn(combined, "active:opacity-95");

      return (
        <Pressable
          ref={ref}
          onPress={onPress}
          className={pressableClasses}
        >
          {children}
        </Pressable>
      );
    }

    return (
      <View ref={ref} className={combined}>
        {children}
      </View>
    );
  }
);

Card.displayName = "Card";