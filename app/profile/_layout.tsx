import { Stack } from "expo-router";

export default function PublicUserProfileLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="[userId]" />
      <Stack.Screen name="public" />
      <Stack.Screen name="edit-public" />
    </Stack>
  );
}