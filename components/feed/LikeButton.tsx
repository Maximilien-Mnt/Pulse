// ---------------------------------------------------------------------------
// PULSE — Favorite Button (Clubs & Events)
//
// Animated heart icon that fills on like and unfills on unlike, with a spring
// pop effect borrowed from the feed LikeButton.  Shows an optional count badge.
// ---------------------------------------------------------------------------

import { useEffect, useRef } from "react";
import { Animated, Pressable } from "react-native";

import { Icon } from "@/components/ui/Icon";
import { Text } from "@/components/ui/Text";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface FavoriteButtonProps {
  isFavorite: boolean;
  count?: number;
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
  isPending = false,
  onPress,
  size = 20,
  accessibilityHint,
  accessibilityLabel,
  testID,
}: FavoriteButtonProps) {
  const reduceMotion = useReducedMotion();
  const scale = useRef(new Animated.Value(1)).current;
  const likedRef = useRef(isFavorite);

  // Small pop whenever the favorite state flips (like OR unlike).
  useEffect(() => {
    if (likedRef.current === isFavorite) return;
    likedRef.current = isFavorite;

    if (reduceMotion) {
      scale.setValue(1);
      return;
    }

    // Bounce toward the new state before settling at 1
    scale.setValue(isFavorite ? 0.6 : 1.3);
    Animated.spring(scale, {
      toValue: 1,
      friction: 5,
      tension: 320,
      useNativeDriver: true,
    }).start();
  }, [isFavorite, reduceMotion, scale]);

  // Default accessible label describes the action and current state.
  const effectiveLabel =
    accessibilityLabel ?? (isFavorite ? "Retirer des favoris" : "Ajouter aux favoris");

  // Accessible hint describes what happens next (e.g. updates the count).
  const effectiveHint =
    accessibilityHint ??
    (isFavorite
      ? "Retire ce contenu de tes favoris"
      : "Ajoute ce contenu à tes favoris");

  // Accessible value exposes the current like count so AT users hear the
  // number alongside the action label.
  const effectiveValue = count !== undefined && count > 0 ? `${count} ${isFavorite ? "favoris" : "j'aime"}` : undefined;

  return (
    <Pressable
      onPress={onPress}
      disabled={isPending}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={effectiveLabel}
      accessibilityHint={effectiveHint}
      accessibilityValue={effectiveValue}
      accessibilityState={{
        selected: isFavorite,
        disabled: isPending,
      }}
      hitSlop={8}
      className="flex-row items-center gap-1"
      style={{ opacity: isPending ? 0.6 : 1 }}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <Icon
          name="Heart"
          size={size}
          color={isFavorite ? "secondary" : "text-secondary"}
          active={isFavorite}
          decorative
        />
      </Animated.View>
      {count !== undefined && count > 0 && (
        <Text variant="caption" className="text-text-tertiary tabular-nums">
          {count}
        </Text>
      )}
    </Pressable>
  );
}
