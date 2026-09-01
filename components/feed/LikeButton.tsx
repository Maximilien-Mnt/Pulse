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
}

export function FavoriteButton({
  isFavorite,
  count,
  isPending = false,
  onPress,
  size = 20,
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

  return (
    <Pressable
      onPress={onPress}
      disabled={isPending}
      accessibilityRole="button"
      accessibilityLabel={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
      accessibilityState={{ selected: isFavorite, disabled: isPending }}
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
