import { useFeedStore } from "@/stores/feedStore";
import { Icon } from "@/components/ui/Icon";
import { Pressable, Text, View } from "react-native";

/**
 * Small bar above the FlashList showing the active tag from useFeedStore.activeTag
 * with a clear button.
 */
export function TagFilterBanner() {
  const activeTag = useFeedStore((s) => s.activeTag);
  const setActiveTag = useFeedStore((s) => s.setActiveTag);

  if (!activeTag) return null;

  return (
    <View className="flex-row items-center justify-between px-4 py-2 bg-primary/10 border-b border-primary/20">
      <View className="flex-row items-center gap-2">
        <Icon name="Tag" size={16} color="primary" />
        <Text className="text-sm font-medium text-primary">#{activeTag}</Text>
      </View>
      <Pressable onPress={() => setActiveTag(null)} hitSlop={8}>
        <Icon name="XCircle" size={20} color="text-tertiary" />
      </Pressable>
    </View>
  );
}