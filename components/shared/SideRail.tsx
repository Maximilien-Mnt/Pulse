// ---------------------------------------------------------------------------
// PULSE DESIGN SYSTEM — Side Rail (Web ≥768px)
//
// Left sidebar navigation replacing the bottom tab bar on wider viewports.
// - 72px wide between 768-1023px (icons only)
// - 240px wide from 1024px+ (icons + labels)
// - Create button integrated as a circle in the rail
//
// Background: surface, right border: 1px border
//
// The selected tab is NOT painted with a per-row background: a single tinted
// rectangle slides between rows (see NavTabMotion) so the active state reads
// as one continuous element moving through the rail rather than four
// independently blinking pills. Tab hover/press motion is delegated to
// <NavTab> so it matches the bottom TabBar exactly.
// ---------------------------------------------------------------------------

import React, { useEffect, useState } from "react";
import { View, Pressable, Animated, Platform } from "react-native";
import { useRouter, usePathname } from "expo-router";
import { useWindowDimensions } from "react-native";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Text } from "@/components/ui/Text";
import { useNavbarStore } from "@/stores/navbarStore";
import { useThemeStore } from "@/stores/themeStore";
import { CreateBottomSheet } from "@/components/shared/CreateBottomSheet";
import {
  INDICATOR_INSET,
  INDICATOR_RADIUS,
  NavTab,
  useSlidingIndicator,
} from "@/components/shared/NavTabMotion";
import { t } from "@/hooks/useTranslation";
import { semanticColors } from "@/src/design-tokens/semantic/colors";
import { cn } from "@/utils/format";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

interface TabItem {
  route: string;
  icon: IconName;
  label: string;
}

const SIDE_TABS: TabItem[] = [
  { route: "/(tabs)/feed",             icon: "Home",           label: "Feed" },
  { route: "/(tabs)/explore",          icon: "Search",         label: "Explorer" },
  { route: "/(tabs)/conversations",    icon: "MessageCircle",  label: "Messages" },
  { route: "/(tabs)/profile",          icon: "UserCircle",     label: "Profil" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SideRail() {
  const { width } = useWindowDimensions();
  const router = useRouter();
  const pathname = usePathname();
  const expanded = width >= 1024;
  const setNavbarPosition = useNavbarStore((s) => s.setPosition);
  const [createOpen, setCreateOpen] = useState(false);

  const isActive = (routePath: string) => {
    // routePath e.g. "/(tabs)/feed" → tab name is "feed"
    const tabName = routePath.split("/").pop();
    // pathname e.g. "/feed", "/feed/[postId]/comments", "/explore"
    const pathParts = pathname.split("/").filter(Boolean);
    return pathParts[0] === tabName;
  };

  const handleCreatePress = () => {
    setCreateOpen(true);
  };

  const railWidth = expanded ? 240 : 72;

  // ---- Sliding active indicator -------------------------------------------
  // NOTE: `findIndex` hands the callback the tab *object*, not its route
  // string — `isActive` expects a string, so unwrap it explicitly. Passing
  // `isActive` directly crashes with "routePath.split is not a function".
  const activeIndex = SIDE_TABS.findIndex((tab) => isActive(tab.route));
  const { recordRow, syncTo, invalidate, indicatorStyle, reduceMotion } =
    useSlidingIndicator(SIDE_TABS.length);

  // `activeIndex` is derived from the pathname on every render, so this effect
  // re-runs on navigation and moves the tint to the newly selected row.
  useEffect(() => {
    syncTo(activeIndex);
  }, [activeIndex, pathname, syncTo]);

  // Collapse ↔ expand (the 1024px breakpoint) re-lays-out every row. The
  // cached offsets are stale at that point, so drop them and let the fresh
  // onLayout measurements re-place the indicator.
  useEffect(() => {
    invalidate();
  }, [expanded, invalidate]);

  // Resolved from the design tokens rather than hardcoded, so the indicator
  // stays correct in dark mode and tracks `bg-primary-tint` exactly.
  const isDark = useThemeStore((s) => s.isDark);
  const tintColor = isDark
    ? semanticColors.dark["primary-tint"]
    : semanticColors.light["primary-tint"];

  return (
    <View
      className="bg-surface dark:bg-surface-dark border-r border-border dark:border-border-dark h-full"
      style={{ width: railWidth }}
    >
      {/* Logo / App name area */}
      <View className="h-16 items-center justify-center border-b border-border dark:border-border-dark px-4">
        <Text variant="buttonLabel" className="text-primary">
          {expanded ? "Pulse" : "P"}
        </Text>
      </View>

      {/* Tab stack. `relative` anchors the absolutely-positioned indicator. */}
      <View className="flex-1 py-4 gap-2 px-3 relative">
        {/* Sliding active background — one tinted rectangle that travels
            between rows. Rendered first so it sits behind the tab content. */}
        {activeIndex >= 0 ? (
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: "absolute",
                left: INDICATOR_INSET,
                right: INDICATOR_INSET,
                borderRadius: INDICATOR_RADIUS,
                backgroundColor: tintColor,
              },
              // Under reduced motion there is no animation to drive, so the
              // active row paints a static tint of its own instead (below) —
              // otherwise the selected state would become invisible.
              indicatorStyle,
            ]}
          />
        ) : null}

        {/* Standard tabs */}
        {SIDE_TABS.map((tab, index) => {
          const active = isActive(tab.route);
          const tabName = tab.route.split("/").pop();
          return (
            <NavTab
              key={tab.route}
              underlay
              active={active}
              onLayout={(e) =>
                recordRow(index, e.nativeEvent.layout.y, e.nativeEvent.layout.height)
              }
              onPress={() => {
                // Always navigate for non-profile tabs when not active
                // For profile, always navigate to root even if in a sub-screen
                if (!active || tabName === "profile") {
                  if (tabName === "profile") {
                    router.replace("/(tabs)/profile");
                  } else {
                    router.push(tab.route);
                  }
                }
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={tab.label}
              className={cn(
                "py-3",
                expanded ? "px-3 flex-row items-center gap-3" : "items-center justify-center",
                // Reduced motion: no sliding indicator, so the active row
                // carries its own static tint to stay visible.
                reduceMotion && active && "bg-primary-tint dark:bg-primary-tint-dark"
              )}
            >
              <Icon
                name={tab.icon}
                size={24}
                color={active ? "primary" : "text-tertiary"}
              />
              {expanded ? (
                <Text
                  variant="buttonLabel"
                  className={active ? "text-primary" : "text-tertiary"}
                >
                  {tab.label}
                </Text>
              ) : null}
            </NavTab>
          );
        })}

        {/* Create — pill button expands to show label when rail is expanded */}
        <Pressable
          onPress={handleCreatePress}
          accessibilityRole="button"
          accessibilityLabel={t("common.create")}
          className={`bg-primary shadow-sm dark:shadow-none mt-2 ${
            expanded
              ? "flex-row items-center justify-center gap-2 px-4 py-2.5 rounded-full self-stretch"
              : "w-14 h-14 items-center justify-center rounded-full self-center"
          }`}
        >
          <Icon name="Plus" size={24} color="text-inverse" />
          {expanded ? (
            <Text variant="buttonLabel" className="text-white">
              Créer
            </Text>
          ) : null}
        </Pressable>
      </View>

      {/* Bottom spacer */}
      <View className="flex-1" />

      {/* Create bottom sheet — modal overlay */}
      <CreateBottomSheet visible={createOpen} onClose={() => setCreateOpen(false)} />

      {/* Profile / settings at bottom + navbar layout toggle */}
      <View className="px-3 pb-6">
        <Pressable
          onPress={() => router.push("/(tabs)/profile/settings" as any)}
          className={`rounded-lg py-3 ${expanded ? "px-3 flex-row items-center gap-3" : "items-center justify-center"}`}
        >
          <Icon
            name="Settings"
            size={24}
            color="text-tertiary"
          />
          {expanded ? (
            <Text variant="body" className="text-tertiary">
              Paramètres
            </Text>
          ) : null}
        </Pressable>

        {/* Move navbar to the bottom (web only layout preference) */}
        <Pressable
          onPress={() => setNavbarPosition("bottom")}
          accessibilityRole="button"
          accessibilityLabel="Barre de navigation en bas"
          className={`rounded-lg py-3 ${expanded ? "px-3 flex-row items-center gap-3" : "items-center justify-center"}`}
        >
          <Icon
            name="PanelBottom"
            size={24}
            color="text-tertiary"
          />
          {expanded ? (
            <Text variant="body" className="text-tertiary">
              Barre en bas
            </Text>
          ) : null}
        </Pressable>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Hook: determines whether to render SideRail or TabBar
// ---------------------------------------------------------------------------

export function useIsWebWide(): boolean {
  // Call the hook unconditionally — an early `return` before a hook violates
  // the rules of hooks (the hook count would differ between native and web).
  // Use a simple breakpoint check — the component will re-render on resize
  const { width } = useWindowDimensions();
  return Platform.OS === "web" && width >= 768;
}