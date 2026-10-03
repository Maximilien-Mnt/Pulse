import type { ReactNode } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/utils/format";
import { useRouter } from "expo-router";
import { Pressable, Text, View, type LayoutChangeEvent } from "react-native";
import { SearchBar } from "./SearchBar";
import { BackButton } from "../ui/BackButton";
import { IconButton } from "../ui/IconButton";
import { PressableScale } from "../ui/PressableScale";
import { useThemeStore } from "@/stores/themeStore";
import { useLanguageStore } from "@/stores/languageStore";
import { useTranslation } from "@/hooks/useTranslation";

type Props = {
  title: string;
  titleClassName?: string;
  /** Show the canonical back button at the top-left of the header. */
  showBackButton?: boolean;
  centerTitle?: boolean;
  backFallbackRoute?: string;
  backToLanding?: boolean;
  searchValue?: string;
  onSearchChange?: (t: string) => void;
  onSearchClear?: () => void;
  onSearchCollapse?: () => void;
  searchPlaceholder?: string;
  searchExpanded?: boolean;
  onSearchPress?: () => void;
  onTitlePress?: () => void;
  showAvatar?: boolean;
  avatarUrl?: string | null;
  rightSlot?: ReactNode;
  showThemeToggle?: boolean;
  showLanguageToggle?: boolean;
  onLayout?: (e: LayoutChangeEvent) => void;
  className?: string;
  /** Show a cancel button instead of the back button at the top-left of the header. */
  showCancelButton?: boolean;
  /** Called when the cancel button is pressed. */
  onCancel?: () => void;
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
  showCancelButton = false,
  onCancel,
}: Props) {
  const router = useRouter();
  const { t, language } = useTranslation();
  const isDark = useThemeStore((s) => s.isDark);
  const fallbackRoute = backFallbackRoute ?? (backToLanding ? "/" : undefined);

  return (
    <View className={cn("px-4 pt-2 pb-3 bg-neutral-50 dark:bg-[#0A0F1E]", className)} onLayout={onLayout}>
      <View className="flex-row items-center gap-3">
        {showCancelButton ? (
          <IconButton
            icon="X"
            iconSize={24}
            label="Annuler"
            hitSlop={8}
            onPress={onCancel ?? (() => router.replace("/"))}
          />
        ) : showBackButton ? (
          <BackButton fallbackRoute={fallbackRoute} />
        ) : null}

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
          <IconButton
            icon={isDark ? "Sun" : "Moon"}
            iconSize={24}
            label={isDark ? t("theme.light") : t("theme.dark")}
            hint={isDark ? "Activer le mode clair" : "Activer le mode sombre"}
            hitSlop={8}
            onPress={() => useThemeStore.getState().toggle()}
          />
        ) : null}

        {showLanguageToggle ? (
          // Kept as a text button (the "FR"/"EN" pair *is* the current-language
          // indicator, so a globe glyph would lose information). It reuses the
          // exact same motion + surface language as <IconButton tone="primary">
          // so it still animates identically — see ICON_BUTTON_* constants.
          <PressableScale
            onPress={() => useLanguageStore.getState().toggle()}
            scaleOnPress={0.9}
            scaleOnHover={1.06}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t("lang.toggle")}
            className="w-11 h-11 rounded-full items-center justify-center shrink-0 bg-primary/10 dark:bg-primary-dark/15 active:bg-primary/20 dark:active:bg-primary-dark/25 transition-colors duration-150"
          >
            <Text className="text-xs font-bold text-primary dark:text-primary-dark">
              {language === "fr" ? "EN" : "FR"}
            </Text>
          </PressableScale>
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
