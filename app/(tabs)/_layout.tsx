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
      <Tabs.Screen name="clubs/index" />
      <Tabs.Screen name="create/index" />
      <Tabs.Screen name="events/index" />
      <Tabs.Screen name="conversations/index" />
      <Tabs.Screen name="profile" options={{ href: null }} />
    </Tabs>
  );
}