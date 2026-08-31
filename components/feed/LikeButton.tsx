// ---------------------------------------------------------------------------
// PULSE FEED — Like Button
//
// Blue, filled heart when the post is liked; default outline heart otherwise.
// Plays a small pop animation on every like/unlike tap. The count next to the
// icon always mirrors the exact value returned by the database.
// ---------------------------------------------------------------------------

import { useEffect, useRef } from "react";
import { Animated, Pressable } from "react-native";

import { Icon } from "@/components/ui/Icon";
import { Text } from "@/components/ui/Text";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface LikeButtonProps {
  liked: boolean;
  likesCount: number;
  isPending?: boolean;
  onPress: () => void;
}

export function LikeButton({
  liked,
  likesCount,
  isPending = false,
  onPress,
}: LikeButtonProps) {
  const reduceMotion = useReducedMotion();
  const scale = useRef(new Animated.Value(1)).current;
  const likedRef = useRef(liked);

  // Small pop whenever the liked state flips (like OR unlike).
  useEffect(() => {
    if (likedRef.current === liked) return;
    likedRef.current = liked;

    if (reduceMotion) {
      scale.setValue(1);
      return;
    }

    scale.setValue(liked ? 0.6 : 1.3);
    Animated.spring(scale, {
      toValue: 1,
      friction: 5,
      tension: 320,
      useNativeDriver: true,
    }).start();
  }, [liked, reduceMotion, scale]);

  return (
    <Pressable
      onPress={onPress}
      disabled={isPending}
      accessibilityRole="button"
      accessibilityLabel={liked ? "Ne plus aimer" : "Aimer"}
      accessibilityState={{ selected: liked, disabled: isPending }}
      hitSlop={8}
      className="flex-row items-center gap-1.5"
      style={{ opacity: isPending ? 0.6 : 1 }}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <Icon
          name="Heart"
          size={20}
          color={liked ? "primary" : "text-tertiary"}
          active={liked}
        />
      </Animated.View>
      <Text variant="caption" className="text-text-tertiary tabular-nums">
        {likesCount}
      </Text>
    </Pressable>
  );
}