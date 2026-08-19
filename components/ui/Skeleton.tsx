// ---------------------------------------------------------------------------
// PULSE DESIGN SYSTEM — Skeleton loading placeholder
//
// A pulsing shimmer block used during data loading.
// Usage: <Skeleton className="w-full h-4 rounded-sm" />
// ---------------------------------------------------------------------------

import React, { useEffect, useRef } from "react";
import { Animated, View, Platform } from "react-native";
import { cn } from "@/utils/format";

export interface SkeletonProps {
  className?: string;
  /** Height in px. Must use spacing scale values (4, 8, 12, 16, 24, 32, 40, 48, 64, 80, 96). */
  height?: number;
  /** Width in px. Must use spacing scale values (4, 8, 12, 16, 24, 32, 40, 48, 64, 80, 96). */
  width?: number;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className, height, width }) => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: Platform.OS !== "web",
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={{ opacity, height, width }}
      className={cn("bg-neutral-200 dark:bg-neutral-700 rounded-md", className)}
    />
  );
};