import { Stack } from "expo-router";

export default function ProfileLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="events" />
      <Stack.Screen name="accepted-events" />
      <Stack.Screen name="user-posts" />
      <Stack.Screen name="public" />
      <Stack.Screen name="clubs" />
      <Stack.Screen name="legal" />
    </Stack>
  );
}
