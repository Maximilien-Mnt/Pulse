// ---------------------------------------------------------------------------
// PULSE FEED — Comment Button
//
// Comment icon + count. Plays a small pop animation on every tap, mirroring
// the LikeButton animation so the actions bar feels consistent.
// ---------------------------------------------------------------------------

import { useCallback, useRef } from "react";
import { Animated, Pressable } from "react-native";

import { Icon } from "@/components/ui/Icon";
import { Text } from "@/components/ui/Text";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface CommentButtonProps {
  commentsCount: number;
  onPress: () => void;
}

export function CommentButton({ commentsCount, onPress }: CommentButtonProps) {
  const reduceMotion = useReducedMotion();
  const scale = useRef(new Animated.Value(1)).current;
  const animatingRef = useRef(false);

  const handlePress = useCallback(() => {
    // Pop on every tap (like the LikeButton pop on like/unlike).
    if (!reduceMotion && !animatingRef.current) {
      animatingRef.current = true;
      scale.setValue(0.6);
      Animated.spring(scale, {
        toValue: 1,
        friction: 5,
        tension: 320,
        useNativeDriver: true,
      }).start(() => {
        animatingRef.current = false;
      });
    }
    onPress();
  }, [onPress, reduceMotion, scale]);

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel="Commenter"
      hitSlop={8}
      className="flex-row items-center gap-1.5"
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <Icon name="MessageSquare" size={20} color="text-tertiary" />
      </Animated.View>
      <Text variant="caption" className="text-text-tertiary tabular-nums">
        {commentsCount}
      </Text>
    </Pressable>
  );
}
