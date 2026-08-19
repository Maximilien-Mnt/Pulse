import type { ReactNode } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/utils/format";
import { useRouter } from "expo-router";
import { Pressable, Text, View, type LayoutChangeEvent } from "react-native";
import { SearchBar } from "./SearchBar";
import { BackButton } from "../ui/BackButton";

type Props = {
  title: string;
  titleClassName?: string;
  /** Show the canonical back button at the top-left of the header. */
  showBackButton?: boolean;
  /** Route to fall back to when there is no navigation history. */
  backFallbackRoute?: string;
  searchValue?: string;
  onSearchChange?: (t: string) => void;
  onSearchClear?: () => void;
  onSearchCollapse?: () => void;
  searchPlaceholder?: string;
  searchExpanded?: boolean;
  onSearchPress?: () => void;
  /** Called when the title text is tapped. */
  onTitlePress?: () => void;
  showAvatar?: boolean;
  avatarUrl?: string | null;
  rightSlot?: ReactNode;
  /** Called when the header's root view layout changes. */
  onLayout?: (e: LayoutChangeEvent) => void;
};

export function Header({
  title,
  titleClassName,
  showBackButton = false,
  backFallbackRoute,
  searchValue,
  onSearchChange,
  onSearchClear,
  onSearchCollapse,
  searchPlaceholder,
  searchExpanded,
  onSearchPress,
  onTitlePress,
  showAvatar,
  avatarUrl,
  rightSlot,
  onLayout,
}: Props) {
  const router = useRouter();

  return (
    <View className="px-4 pt-2 pb-3 bg-neutral-50 dark:bg-[#0A0F1E]" onLayout={onLayout}>
      <View className="flex-row items-center gap-3">
        {showBackButton ? <BackButton fallbackRoute={backFallbackRoute} /> : null}

        {onTitlePress ? (
          <Pressable onPress={onTitlePress} hitSlop={8}>
            <Text className={cn("text-2xl font-bold text-primary dark:text-primary-dark flex-shrink", titleClassName)}>{title}</Text>
          </Pressable>
        ) : (
          <Text className={cn("text-2xl font-bold text-primary dark:text-primary-dark flex-shrink", titleClassName)}>{title}</Text>
        )}

        {onSearchChange ? (
          <View className="flex-1">
            <SearchBar
              value={searchValue ?? ""}
              onChangeText={onSearchChange}
              onClear={onSearchClear}
              onCollapse={onSearchCollapse}
              placeholder={searchPlaceholder}
              onPress={onSearchPress}
              expanded={searchExpanded}
            />
          </View>
        ) : null}

        {rightSlot}

        {showAvatar ? (
          <Pressable onPress={() => router.push("/(tabs)/profile")} hitSlop={8}>
            <Avatar uri={avatarUrl ?? null} size={24} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}