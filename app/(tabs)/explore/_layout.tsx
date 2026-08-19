import { Stack } from "expo-router";

export default function ExploreLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="club/[clubId]" />
      <Stack.Screen name="event/[eventId]" />
    </Stack>
  );
}
