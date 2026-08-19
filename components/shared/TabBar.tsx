// ---------------------------------------------------------------------------
// PULSE DESIGN SYSTEM — Mobile Tab Bar (bottom)
//
// 5 tabs: Feed, Explorer, [Create], Messages, Profile
// The Create button is a raised circle centered above the bar.
// Tapping it opens CreateBottomSheet instead of navigating.
//
// Height: 64px + safe-area-inset-bottom
// Background: surface, top border: 1px border
// ---------------------------------------------------------------------------

import React, { useState } from "react";
import { View, Pressable, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, usePathname } from "expo-router";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Icon, type IconName } from "@/components/ui/Icon";
import { useNavbarStore } from "@/stores/navbarStore";
import { useIsWebWide } from "@/components/shared/SideRail";
import { CreateBottomSheet } from "@/components/shared/CreateBottomSheet";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

interface TabItem {
  route: string;      // expo-router path
  icon: IconName;
  label: string;
}

const MAIN_TABS: TabItem[] = [
  { route: "feed",              icon: "Home",           label: "Feed" },
  { route: "explore",           icon: "Search",         label: "Explorer" },
  // Create slot (handled separately as floating button)
  { route: "conversations",     icon: "MessageCircle",  label: "Messages" },
  { route: "profile",           icon: "UserCircle",     label: "Profil" },
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

  return (
    <View
      className="bg-surface dark:bg-surface-dark border-t border-border dark:border-border-dark flex-row items-center justify-around"
      style={{
        height: tabBarHeight + paddingBottom,
        paddingBottom,
      }}
    >
      {/* Feed & Explorer (first 2) */}
      {MAIN_TABS.slice(0, 2).map((tab) => {
        const active = isActive(tab.route);
        return (
          <Pressable
            key={tab.route}
            onPress={() => {
              // Always navigate for non-profile tabs when not active
              // For profile, always navigate to root even if in a sub-screen
              if (!active || tab.route === "profile") {
                navigation.navigate(tab.route as any);
              }
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            className="flex-1 items-center justify-center h-full"
          >
            <View
              className={`items-center justify-center rounded-lg px-3 py-1 ${
                active ? "bg-primary-tint dark:bg-primary-tint-dark" : ""
              }`}
            >
              <Icon
                name={tab.icon}
                size={24}
                color={active ? "primary" : "text-tertiary"}
              />
            </View>
          </Pressable>
        );
      })}

      {/* Create — floating circle */}
      <View className="flex-1 items-center justify-center">
        <Pressable
          onPress={handleCreatePress}
          accessibilityRole="button"
          accessibilityLabel="Créer"
          className="bg-primary rounded-full w-14 h-14 items-center justify-center shadow-sm dark:shadow-none"
          style={{
            // Elevate above the tab bar line
            transform: [{ translateY: Platform.OS === "web" ? -8 : -12 }],
          }}
        >
          <Icon name="Plus" size={24} color="text-inverse" />
        </Pressable>
      </View>

      {/* Messages & Profile (last 2) */}
      {MAIN_TABS.slice(2).map((tab) => {
        const active = isActive(tab.route);
        return (
          <Pressable
            key={tab.route}
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
            className="flex-1 items-center justify-center h-full"
          >
            <View
              className={`items-center justify-center rounded-lg px-3 py-1 ${
                active ? "bg-primary-tint dark:bg-primary-tint-dark" : ""
              }`}
            >
              <Icon
                name={tab.icon}
                size={24}
                color={active ? "primary" : "text-tertiary"}
              />
            </View>
          </Pressable>
        );
      })}

      {/* Web-only (wide enough for the side rail): move navbar back to the left */}
      {isWeb && isWebWide ? (
        <Pressable
          onPress={() => setNavbarPosition("left")}
          accessibilityRole="button"
          accessibilityLabel="Barre de navigation à gauche"
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
