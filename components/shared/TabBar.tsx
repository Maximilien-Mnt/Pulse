// ---------------------------------------------------------------------------
// PULSE DESIGN SYSTEM — Mobile Tab Bar (bottom)
//
// 5 tabs: Feed, Explorer, [Create], Messages, Profile
// The Create button is a raised circle centered above the bar.
// Tapping it opens CreateBottomSheet instead of navigating.
//
// Height: 64px + safe-area-inset-bottom
// Background: surface, top border: 1px border
//
// The active tab is NOT painted per-tab: one tinted capsule slides between the
// four tabs (see NavTabMotion's axis-aware `useSlidingIndicator`), off the same
// spring the vertical SideRail uses. The capsule is sized off the full-height
// tab row rather than the 24px icon, so it reads as a pill behind the whole tab
// instead of a small square behind a glyph.
// ---------------------------------------------------------------------------

import React, { useEffect, useState } from "react";
import { Animated, View, Pressable, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, usePathname } from "expo-router";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Icon, type IconName } from "@/components/ui/Icon";
import { PressableScale } from "@/components/ui/PressableScale";
import {
  INDICATOR_RADIUS,
  NAV_TAB_ICON_SIZE,
  NavTab,
  NavTabIcon,
  TAB_BAR_INDICATOR_HEIGHT,
  useSlidingIndicator,
} from "@/components/shared/NavTabMotion";
import { useNavbarStore } from "@/stores/navbarStore";
import { useIsWebWide } from "@/components/shared/SideRail";
import { useThemeStore } from "@/stores/themeStore";
import { CreateBottomSheet } from "@/components/shared/CreateBottomSheet";
import { semanticColors } from "@/src/design-tokens/semantic/colors";
import { t } from "@/hooks/useTranslation";
import { cn } from "@/utils/format";
import type { TranslationKey } from "@/lib/translations";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

interface TabItem {
  route: string;      // expo-router path
  icon: IconName;
  labelKey: TranslationKey;   // translation key (tabs.*)
}

const MAIN_TABS: TabItem[] = [
  { route: "feed",              icon: "Home",           labelKey: "tabs.feed" },
  { route: "explore",           icon: "Search",         labelKey: "tabs.explore" },
  // Create slot (handled separately as floating button)
  { route: "conversations",     icon: "MessageCircle",  labelKey: "tabs.messages" },
  { route: "profile",           icon: "UserCircle",     labelKey: "tabs.profile" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const setNavbarPosition = useNavbarStore((s) => s.setPosition);
  const [createOpen, setCreateOpen] = useState(false);

  const isWeb = Platform.OS === "web";
  const isWebWide = useIsWebWide();

  // Open the create bottom sheet as a modal overlay
  const handleCreatePress = () => {
    setCreateOpen(true);
  };

  const isActive = (routeName: string) => {
    // routeName is the tab folder name (e.g. "feed", "explore")
    // pathname is the current Expo Router path (e.g. "/feed", "/feed/[postId]/comments")
    const pathParts = pathname.split("/").filter(Boolean);
    // The first segment of the pathname should match the tab name
    return pathParts[0] === routeName;
  };

  const tabBarHeight = 64;
  const paddingBottom = insets.bottom;

  // ---- Sliding active capsule ----------------------------------------------
  // Fed `x`/`width` (not `y`/`height`) because the bar travels horizontally.
  const { recordRow, syncTo, invalidate, indicatorStyle, reduceMotion } =
    useSlidingIndicator(MAIN_TABS.length, "horizontal");

  const activeIndex = MAIN_TABS.findIndex((tab) => isActive(tab.route));

  // `activeIndex` is derived from the pathname on every render, so this effect
  // re-runs on navigation and slides the capsule to the newly selected tab.
  useEffect(() => {
    syncTo(activeIndex);
  }, [activeIndex, pathname, syncTo]);

  // The bar's row geometry depends on the web-only trailing toggle, which
  // appears once the viewport crosses the 768px breakpoint. Drop the cached
  // measurements there so the capsule re-places against fresh layouts.
  useEffect(() => {
    invalidate();
  }, [isWebWide, invalidate]);

  // Resolved from the design tokens rather than hardcoded, so the capsule stays
  // correct in dark mode and tracks `bg-primary-tint` exactly.
  const isDark = useThemeStore((s) => s.isDark);
  const tintColor = isDark
    ? semanticColors.dark["primary-tint"]
    : semanticColors.light["primary-tint"];

  /** One tab, measured so the capsule can travel onto it. */
  const renderTab = (tab: TabItem, index: number) => {
    const active = isActive(tab.route);
    return (
      <NavTab
        key={tab.route}
        active={active}
        onLayout={(e) =>
          recordRow(index, e.nativeEvent.layout.x, e.nativeEvent.layout.width)
        }
        onPress={() => {
          // Always navigate for non-profile tabs when not active
          // For profile, always navigate to root even if in a sub-screen
          if (!active || tab.route === "profile") {
            if (tab.route === "profile") {
              // Always return to the profile root, even from a sub-screen
              router.replace("/(tabs)/profile");
            } else {
              navigation.navigate(tab.route as any);
            }
          }
        }}
        accessibilityRole="tab"
        accessibilityState={{ selected: active }}
        accessibilityLabel={t(tab.labelKey)}
        className={cn(
          "flex-1 items-center justify-center h-full",
          // Reduced motion: no sliding capsule, so the active tab carries its own
          // static tint to stay visible (mirrors the SideRail fallback).
          reduceMotion && active && "bg-primary-tint dark:bg-primary-tint-dark"
        )}
      >
        <NavTabIcon name={tab.icon} size={NAV_TAB_ICON_SIZE} />
      </NavTab>
    );
  };

  return (
    <View
      className="bg-surface dark:bg-surface-dark border-t border-border dark:border-border-dark flex-row items-center"
      style={{
        height: tabBarHeight + paddingBottom,
        paddingBottom,
      }}
    >
      {/* Inner row. `relative` anchors the capsule, and it must be the SAME box
          the tabs are measured against — otherwise `layout.x` (relative to this
          view) would be offset from the capsule's absolute `left`. */}
      <View className="flex-1 flex-row items-center justify-around">
        {/* Sliding active capsule — one tinted rectangle that travels between
            tabs. Rendered first so it sits behind the tab content.
            Skipped entirely under reduced motion: `indicatorStyle` is null
            there, so the capsule would have no `left`/`width` and would sit
            unpositioned at the bar's left edge. The active tab paints its own
            static tint instead (see `renderTab`). */}
        {activeIndex >= 0 && !reduceMotion ? (
          <Animated.View
            pointerEvents="none"
            testID="active-capsule"
            style={[
              {
                position: "absolute",
                // Centre the fixed-height capsule in the 64px bar, so it never
                // collides with the raised Create button's shadow.
                top: (tabBarHeight - TAB_BAR_INDICATOR_HEIGHT) / 2,
                height: TAB_BAR_INDICATOR_HEIGHT,
                borderRadius: INDICATOR_RADIUS,
                backgroundColor: tintColor,
              },
              // Under reduced motion there is no animation to drive, so the
              // active tab paints a static tint of its own instead (above).
              indicatorStyle,
            ]}
          />
        ) : null}

        {/* Feed & Explorer (first 2) */}
        {MAIN_TABS.slice(0, 2).map((tab, i) => renderTab(tab, i))}

        {/* Create — floating circle.
            Slightly gentler press scale than the tab default (0.9): a 56px
            circular target carries more visual mass than a tab row, so the same
            squash would read as too aggressive here. */}
        <View className="flex-1 items-center justify-center">
          <PressableScale
            onPress={handleCreatePress}
            scaleOnPress={0.92}
            accessibilityRole="button"
            accessibilityLabel={t("common.create")}
            accessibilityHint={t("tabs.createHint")}
            className="bg-primary rounded-full w-14 h-14 items-center justify-center dark:shadow-none"
            style={{
              // Elevate above the tab bar line
              transform: [{ translateY: Platform.OS === "web" ? -8 : -12 }],
              ...(Platform.OS === "web" ? { boxShadow: "0 2px 8px rgba(0,0,0,0.15)" } : {}),
            }}
          >
            <Icon name="Plus" size={NAV_TAB_ICON_SIZE} color="text-inverse" />
          </PressableScale>
        </View>

        {/* Messages & Profile (last 2) — indices continue at 2 so the capsule
            can travel across the Create gap without a re-measure. */}
        {MAIN_TABS.slice(2).map((tab, i) => renderTab(tab, i + 2))}
      </View>

      {/* Web-only (wide enough for the side rail): move navbar back to the left */}
      {isWeb && isWebWide ? (
        <Pressable
          onPress={() => setNavbarPosition("left")}
          accessibilityRole="button"
          accessibilityLabel={t("settings.barLeft")}
          className="px-2 items-center justify-center h-full"
        >
          <View className="items-center justify-center rounded-lg p-2">
            <Icon name="PanelLeft" size={20} color="text-tertiary" />
          </View>
        </Pressable>
      ) : null}

      {/* Create bottom sheet — modal overlay */}
      <CreateBottomSheet visible={createOpen} onClose={() => setCreateOpen(false)} />
    </View>
  );
}
