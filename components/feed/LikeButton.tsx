// ---------------------------------------------------------------------------
// PULSE — Favorite Button (Clubs & Events)
//
// Animated heart icon that fills on like and unfills on unlike, with a spring
// pop effect borrowed from the feed LikeButton.  Shows an optional count badge.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Pressable } from "react-native";

import { Icon } from "@/components/ui/Icon";
import { Text } from "@/components/ui/Text";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface FavoriteButtonProps {
  isFavorite: boolean;
  count?: number;
  /** Accepted for API compatibility; ignored — button stays pressable for instant feedback. */
  isPending?: boolean;
  onPress: () => void;
  size?: number;
  /** When provided, used as the accessible hint describing the action. */
  accessibilityHint?: string;
  /** When provided, overrides the default accessible label. */
  accessibilityLabel?: string;
  /** Test identifier for E2E and unit tests. */
  testID?: string;
}

export function FavoriteButton({
  isFavorite,
  count,
  isPending: _isPending,
  onPress,
  size = 20,
  accessibilityHint,
  accessibilityLabel,
  testID,
}: FavoriteButtonProps) {
  const reduceMotion = useReducedMotion();
  void _isPending; // accepted for API compat, intentionally ignored
  const scale = useRef(new Animated.Value(1)).current;
  const likedRef = useRef(isFavorite);

  // Local instant visual state: flips synchronously on press so the heart
  // turns blue (+ pop) and the count does ±1 without waiting for the
  // optimistic hook state / backend round-trip. Reconciled with `isFavorite`
  // / `count` props (server truth or rollback restores the default look).
  const [visualLiked, setVisualLiked] = useState(isFavorite);
  const visualCount =
    count === undefined
      ? undefined
      : Math.max(0, count + (visualLiked === isFavorite ? 0 : visualLiked ? 1 : -1));

  const playPop = useCallback(
    (toLiked: boolean) => {
      if (reduceMotion) {
        scale.setValue(1);
        return;
      }
      // Bounce toward the new state before settling at 1
      scale.setValue(toLiked ? 0.6 : 1.3);
      Animated.spring(scale, {
        toValue: 1,
        friction: 5,
        tension: 320,
        useNativeDriver: true,
      }).start();
    },
    [reduceMotion, scale]
  );

  // Server truth / rollback: reconcile instant visuals with the authoritative
  // prop. Setting visualLiked triggers the pop effect below (or restores the
  // default heart + count on failure).
  useEffect(() => {
    setVisualLiked(isFavorite);
  }, [isFavorite]);

  useEffect(() => {
    if (likedRef.current === visualLiked) return;
    likedRef.current = visualLiked;
    playPop(visualLiked);
  }, [visualLiked, playPop]);

  // Instant feedback: flip visuals + play the pop in the same frame as the
  // press, without waiting for the optimistic state / backend round-trip.
  const handlePress = useCallback(() => {
    setVisualLiked((v) => !v);
    onPress();
  }, [onPress]);

  // Default accessible label describes the action and current state.
  const effectiveLabel =
    accessibilityLabel ?? (visualLiked ? "Retirer des favoris" : "Ajouter aux favoris");

  // Accessible hint describes what happens next (e.g. updates the count).
  const effectiveHint =
    accessibilityHint ??
    (visualLiked
      ? "Retire ce contenu de tes favoris"
      : "Ajoute ce contenu à tes favoris");

  // Accessible value exposes the current like count so AT users hear the
  // number alongside the action label.
  const effectiveValue =
    visualCount !== undefined && visualCount > 0
      ? `${visualCount} ${visualLiked ? "favoris" : "j'aime"}`
      : undefined;

  return (
    <Pressable
      onPress={handlePress}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={effectiveLabel}
      accessibilityHint={effectiveHint}
      accessibilityValue={effectiveValue != null ? { text: effectiveValue } : undefined}
      accessibilityState={{
        selected: visualLiked,
      }}
      hitSlop={8}
      className="flex-row items-center gap-1"
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <Icon
          name="Heart"
          size={size}
          color="text-secondary"
          active={visualLiked}
          decorative
        />
      </Animated.View>
      {visualCount !== undefined && visualCount > 0 && (
        <Text variant="caption" className="text-text-tertiary tabular-nums">
          {visualCount}
        </Text>
      )}
    </Pressable>
  );
}
