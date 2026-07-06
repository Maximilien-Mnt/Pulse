import type { ReactNode } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/utils/format";
import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { SearchBar } from "./SearchBar";

type Props = {
  title: string;
  titleClassName?: string;
  searchValue?: string;
  onSearchChange?: (t: string) => void;
  searchPlaceholder?: string;
  searchExpanded?: boolean;
  onSearchPress?: () => void;
  showAvatar?: boolean;
  avatarUrl?: string | null;
  rightSlot?: ReactNode;
};

export function Header({
  title,
  titleClassName,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  searchExpanded,
  onSearchPress,
  showAvatar,
  avatarUrl,
  rightSlot,
}: Props) {
  const router = useRouter();
  return (
    <View className="px-4 pt-2 pb-3 bg-neutral-50 dark:bg-[#0A0F1E]">
      <View className="flex-row items-center gap-3">
        <Text className={cn("text-2xl font-bold text-primary flex-shrink", titleClassName)}>{title}</Text>
        {onSearchChange ? (
          <View className="flex-1">
            <SearchBar
              value={searchValue ?? ""}
              onChangeText={onSearchChange}
              placeholder={searchPlaceholder}
              onPress={onSearchPress}
              expanded={searchExpanded}
            />
          </View>
        ) : null}
        {rightSlot}
        {showAvatar ? (
          <Pressable onPress={() => router.push("/(tabs)/profile")} hitSlop={8}>
            <Avatar uri={avatarUrl} size={24} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
