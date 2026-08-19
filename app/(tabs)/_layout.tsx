import { TabBar } from "@/components/shared/TabBar";
import { SideRail, useIsWebWide } from "@/components/shared/SideRail";
import { useNavbarStore } from "@/stores/navbarStore";
import { Tabs } from "expo-router";
import { View } from "react-native";
import { AuthGuard } from "@/components/shared/AuthGuard";

/**
 * Responsive tabs layout:
 * - Mobile (<768px): bottom TabBar + Create bottom sheet overlay
 * - Web (≥768px):
 *   - Default: SideRail on the left, content fills the remaining width.
 *   - User can switch the navbar to the bottom (TabBar) via the toggle button,
 *     in which case the SideRail is hidden — only one navbar is ever shown.
 */

function TabsContent({ showBottomBar }: { showBottomBar: boolean }) {
  return (
    <Tabs
      tabBar={(props) => (showBottomBar ? <TabBar {...props} /> : null)}
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen name="feed" />
      <Tabs.Screen name="explore" />
      <Tabs.Screen name="create/index" options={{ href: null }} />
      <Tabs.Screen name="conversations" />
      <Tabs.Screen name="profile" options={{ href: null }} />
      {/* Keep existing routes that may be deep-linked */}
      <Tabs.Screen name="clubs/index" options={{ href: null }} />
      <Tabs.Screen name="events/index" options={{ href: null }} />
      <Tabs.Screen name="discover/index" options={{ href: null }} />
    </Tabs>
  );
}

export default function TabsLayout() {
  const isWebWide = useIsWebWide();
  const navbarPosition = useNavbarStore((s) => s.position);

  // Web: show the SideRail only when the user hasn't chosen the bottom layout.
  const showSideRail = isWebWide && navbarPosition === "left";
  // Bottom bar: shown on mobile always, on web only when the user chose it.
  const showBottomBar = !isWebWide || navbarPosition === "bottom";

  const content = (
    <AuthGuard>
      {showSideRail ? (
        <View className="flex-1 flex-row bg-bg dark:bg-bg-dark">
          {/* Left rail */}
          <SideRail />

          {/* Main content — full remaining width next to the rail */}
          <TabsContent showBottomBar={showBottomBar} />
        </View>
      ) : (
        <View className="flex-1">
          <TabsContent showBottomBar={showBottomBar} />
        </View>
      )}
    </AuthGuard>
  );

  return content;
}