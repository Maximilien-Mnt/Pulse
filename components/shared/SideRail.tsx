// ---------------------------------------------------------------------------
// PULSE DESIGN SYSTEM — Side Rail (Web ≥768px)
//
// Left sidebar navigation replacing the bottom tab bar on wider viewports.
// - 72px wide between 768-1023px (icons only)
// - 240px wide from 1024px+ (icons + labels)
// - Create button integrated as a circle in the rail
//
// Background: surface, right border: 1px border
// ---------------------------------------------------------------------------

import React, { useState } from "react";
import { View, Pressable, Platform } from "react-native";
import { useRouter, usePathname } from "expo-router";
import { useWindowDimensions } from "react-native";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Text } from "@/components/ui/Text";
import { useNavbarStore } from "@/stores/navbarStore";
import { CreateBottomSheet } from "@/components/shared/CreateBottomSheet";

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

      <View className="flex-1 py-4 gap-2 px-3">
        {/* Standard tabs */}
        {SIDE_TABS.map((tab) => {
          const active = isActive(tab.route);
          const tabName = tab.route.split("/").pop();
          return (
              <Pressable
                key={tab.route}
                onPress={() => {
                  // Always navigate for non-profile tabs when not active
                  // For profile, always navigate to root even if in a sub-screen
                  if (!active || tabName === "profile") {
                    router.replace(tab.route as any);
                  }
                }}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                className={`rounded-lg py-3 ${expanded ? "px-3 flex-row items-center gap-3" : "items-center justify-center"} ${
                  active ? "bg-primary-tint dark:bg-primary-tint-dark" : ""
                }`}
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
            </Pressable>
          );
        })}

        {/* Create — pill button expands to show label when rail is expanded */}
        <Pressable
          onPress={handleCreatePress}
          accessibilityRole="button"
          accessibilityLabel="Créer"
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
  // Only available on web
  if (Platform.OS !== "web") return false;
  // Use a simple breakpoint check — the component will re-render on resize
  const { width } = useWindowDimensions();
  return width >= 768;
}