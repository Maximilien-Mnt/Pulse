// ---------------------------------------------------------------------------
// PULSE DESIGN SYSTEM — Skeleton loading placeholder
//
// A pulsing block used during data loading. Backed by a single shared
// `Animated.Value` (see <SkeletonProvider/>) so a screen full of skeletons
// drives ONE animation loop instead of N. Falls back to a self-contained
// loop when no provider is mounted (tests, isolated previews).
//
// Respects reduced-motion: when the OS/CSS prefers reduced motion the pulse
// is disabled and blocks render as a static, slightly-dimmed fill.
//
// Usage:
//   <Skeleton className="w-full h-4 rounded-sm" />
//   <Skeleton.Line className="w-32" />
//   <Skeleton.Circle className="w-10 h-10" />
//   <Skeleton.Card className="h-24 rounded-2xl" />
// ---------------------------------------------------------------------------

import React, { createContext, useContext, useEffect, useRef } from "react";
import { Animated, Easing, Platform, View } from "react-native";
import { cn } from "@/utils/format";
import { useReducedMotion } from "@/hooks/useReducedMotion";

export interface SkeletonProps {
  className?: string;
  /** Height in px. Must use spacing scale values (4, 8, 12, 16, 24, 32, 40, 48, 64, 80, 96). */
  height?: number;
  /** Width in px. Must use spacing scale values (4, 8, 12, 16, 24, 32, 40, 48, 64, 80, 96). */
  width?: number;
  /** Forwarded to the underlying view so callers can target individual placeholders. */
  testID?: string;
}

// Three-state context:
//   undefined → no provider mounted (component runs its own loop).
//   null      → provider mounted but motion is reduced (render static fill).
//   Animated.Value → shared pulse driven by the provider's single loop.
const SkeletonAnimationContext = createContext<Animated.Value | null | undefined>(
  undefined,
);

/**
 * Mount once near the app root so every <Skeleton> beneath it shares a single
 * animation loop. Without it each skeleton runs an independent loop (still
 * correct, just more work). Safe to nest; the innermost provider wins.
 */
export function SkeletonProvider({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion();
  const shared = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduced) {
      shared.setValue(0.5);
      return;
    }
    const useNativeDriver = Platform.OS !== "web";
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shared, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver,
        }),
        Animated.timing(shared, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reduced, shared]);

  return (
    <SkeletonAnimationContext.Provider value={reduced ? null : shared}>
      {children}
    </SkeletonAnimationContext.Provider>
  );
}

const SkeletonBase: React.FC<SkeletonProps> = ({ className, height, width, testID }) => {
  // undefined => no provider; run a local loop. Animated.Value => shared pulse.
  // null => provider present + reduced motion => static fill.
  const shared = useContext(SkeletonAnimationContext);
  const local = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Only the providerless case needs a self-managed loop.
    if (shared !== undefined) return;
    const useNativeDriver = Platform.OS !== "web";
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(local, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver,
        }),
        Animated.timing(local, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [shared, local]);

  const style: { opacity: number | Animated.AnimatedInterpolation<number>; height?: number; width?: number } =
    shared === null
      ? { opacity: 0.55, height, width }
      : {
          opacity: (shared === undefined ? local : shared).interpolate({
            inputRange: [0, 1],
            outputRange: [0.4, 1],
          }),
          height,
          width,
        };

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID={testID}
      style={style}
      className={cn("bg-neutral-200 dark:bg-neutral-700 rounded-md", className)}
    />
  );
};
SkeletonBase.displayName = "Skeleton";

// --- Semantic subcomponents -------------------------------------------------
// Thin presets over <Skeleton> so call sites read as intent rather than raw
// box classes. All accept the same props (className/height/width/testID).

const Line: React.FC<SkeletonProps & { lines?: number }> = ({
  className,
  lines = 1,
  height = 12,
  testID,
}) => {
  if (lines <= 1) {
    return <SkeletonBase height={height} className={cn("rounded-sm", className)} testID={testID} />;
  }
  return (
    <View className="gap-2" testID={testID}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBase
          key={i}
          height={height}
          className={cn("rounded-sm", i === lines - 1 ? "w-2/3" : "w-full", className)}
        />
      ))}
    </View>
  );
};
Line.displayName = "Skeleton.Line";

const Circle: React.FC<SkeletonProps> = (props) => (
  <SkeletonBase {...props} className={cn("rounded-full", props.className)} />
);
Circle.displayName = "Skeleton.Circle";

const Card: React.FC<SkeletonProps> = (props) => (
  <SkeletonBase {...props} className={cn("rounded-2xl", props.className)} />
);
Card.displayName = "Skeleton.Card";

export const Skeleton = Object.assign(SkeletonBase, { Line, Circle, Card });