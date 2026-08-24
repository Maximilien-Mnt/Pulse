import type { ReactNode } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/utils/format";
import { useRouter } from "expo-router";
import { Pressable, Text, View, type LayoutChangeEvent } from "react-native";
import { SearchBar } from "./SearchBar";
import { BackButton } from "../ui/BackButton";
import { Icon } from "../ui/Icon";
import { useThemeStore } from "@/stores/themeStore";
import { useLanguageStore } from "@/stores/languageStore";
import { useTranslation } from "@/hooks/useTranslation";

type Props = {
  title: string;
  titleClassName?: string;
  /** Show the canonical back button at the top-left of the header. */
  showBackButton?: boolean;
  /** Center the title text (takes remaining space). */
  centerTitle?: boolean;
  /** Route to fall back to when there is no navigation history. */
  backFallbackRoute?: string;
  /** When true, the back button falls back to `/` when there is no history. */
  backToLanding?: boolean;
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
  /** Show the theme (light/dark) toggle button. */
  showThemeToggle?: boolean;
  /** Show the language (fr/en) toggle button. */
  showLanguageToggle?: boolean;
  /** Called when the header's root view layout changes. */
  onLayout?: (e: LayoutChangeEvent) => void;
  /** Additional className for the root header view */
  className?: string;
};

export function Header({
  title,
  titleClassName,
  centerTitle = false,
  showBackButton = false,
  backFallbackRoute,
  backToLanding,
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
  showThemeToggle = true,
  showLanguageToggle = true,
  onLayout,
  className,
}: Props) {
  const router = useRouter();
  const { t, language } = useTranslation();
  const isDark = useThemeStore((s) => s.isDark);
  const fallbackRoute = backFallbackRoute ?? (backToLanding ? "/" : undefined);

  return (
    <View className={cn("px-4 pt-2 pb-3 bg-neutral-50 dark:bg-[#0A0F1E]", className)} onLayout={onLayout}>
      <View className="flex-row items-center gap-3">
        {showBackButton ? <BackButton fallbackRoute={fallbackRoute} /> : null}

        {onTitlePress ? (
          <Pressable onPress={onTitlePress} hitSlop={8}>
            <Text className={cn("flex-1 text-center text-2xl font-bold flex-shrink", centerTitle && "", titleClassName)}>{title}</Text>
          </Pressable>
        ) : (
          <Text className={cn("flex-1 text-center text-2xl font-bold flex-shrink", centerTitle && "", titleClassName)}>{title}</Text>
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

        {showThemeToggle ? (
          <Pressable
            onPress={() => useThemeStore.getState().toggle()}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={isDark ? t("theme.light") : t("theme.dark")}
            className="w-11 h-11 items-center justify-center rounded-full bg-primary/10 active:bg-primary/20"
          >
            <Icon name={isDark ? "Sun" : "Moon"} size={24} color="primary" />
          </Pressable>
        ) : null}

        {showLanguageToggle ? (
          <Pressable
            onPress={() => useLanguageStore.getState().toggle()}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t("lang.toggle")}
            className="w-11 h-11 items-center justify-center rounded-full bg-primary/10 active:bg-primary/20"
          >
            <Text className="text-xs font-bold text-primary dark:text-primary-dark">
              {language.toUpperCase()}
            </Text>
          </Pressable>
        ) : null}

        {showAvatar ? (
          <Pressable onPress={() => router.push("/(tabs)/profile")} hitSlop={8}>
            <Avatar uri={avatarUrl ?? null} size={24} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
