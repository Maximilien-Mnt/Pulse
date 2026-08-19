import { useCallback, useEffect, useRef } from "react";
import { Animated, Pressable, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { cn } from "@/utils/format";

type Props = {
  value: string;
  onChangeText: (t: string) => void;
  onClear?: () => void;
  onCollapse?: () => void;
  placeholder?: string;
  onPress?: () => void;
  expanded?: boolean;
  onSubmitEditing?: () => void;
  className?: string;
};

const ANIM_DURATION = 200;

export function SearchBar({
  value,
  onChangeText,
  onClear,
  onCollapse,
  placeholder = "Rechercher…",
  onPress,
  expanded,
  onSubmitEditing,
  className,
}: Props) {
  // ── Hooks MUST be called unconditionally (before any early return) ─
  const widthAnim = useRef(new Animated.Value(expanded ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: expanded ? 1 : 0,
      duration: ANIM_DURATION,
      useNativeDriver: false,
    }).start();
  }, [expanded, widthAnim]);

  const handleClear = useCallback(() => {
    if (value.length > 0) {
      onChangeText("");
      onClear?.();
    } else {
      // Already empty → collapse
      onCollapse?.();
    }
  }, [value, onChangeText, onClear, onCollapse]);

  // ── Collapsed (pressable stub) ───────────────────────────────────
  if (onPress && !expanded) {
    const hasQuery = value.trim().length > 0;
    return (
      <Pressable
        onPress={onPress}
        className={cn(
          "flex-row items-center bg-neutral-100 dark:bg-neutral-800 rounded-xl px-3 py-2.5",
          className
        )}
      >
        <Ionicons name="search-outline" size={20} color="#94A3B8" />
        <Text
          className={cn(
            "ml-2 flex-1 text-base",
            hasQuery
              ? "text-neutral-900 dark:text-neutral-50"
              : "text-neutral-500"
          )}
          numberOfLines={1}
        >
          {hasQuery ? value : placeholder}
        </Text>
      </Pressable>
    );
  }

  // ── Expanded ─────────────────────────────────────────────────────
  return (
    <View className={cn("flex-row items-center bg-neutral-100 dark:bg-neutral-800 rounded-xl px-3 py-2.5", className)}>
      <Ionicons name="search-outline" size={20} color="#94A3B8" />
      <TextInput
        className="ml-2 flex-1 text-base text-neutral-900 dark:text-neutral-50"
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        value={value}
        onChangeText={onChangeText}
        autoFocus
        returnKeyType="search"
        onSubmitEditing={onSubmitEditing}
      />
      {/* Cross / close button */}
      <Pressable onPress={handleClear} hitSlop={8} className="ml-2">
        <Ionicons
          name={value.length > 0 ? "close-circle" : "close-circle-outline"}
          size={20}
          color="#94A3B8"
        />
      </Pressable>
    </View>
  );
}