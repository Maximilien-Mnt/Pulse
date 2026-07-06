import { TabBar } from "@/components/shared/TabBar";
import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen name="feed" />
      <Tabs.Screen name="clubs" />
      <Tabs.Screen name="create" />
      <Tabs.Screen name="events" />
      <Tabs.Screen name="conversations" />
      <Tabs.Screen name="profile" options={{ href: null }} />
    </Tabs>
  );
}
