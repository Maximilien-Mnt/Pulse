import { Stack } from "expo-router";
import { AuthGuard } from "@/components/shared/AuthGuard";

export default function PublicUserProfileLayout() {
  return (
    <AuthGuard>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="[userId]" />
        <Stack.Screen name="public" />
        <Stack.Screen name="edit-public" />
      </Stack>
    </AuthGuard>
  );
}
