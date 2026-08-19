import { Stack } from "expo-router";
import { AuthGuard } from "@/components/shared/AuthGuard";

export default function JoinLayout() {
  return (
    <AuthGuard>
      <Stack screenOptions={{ headerShown: false }} />
    </AuthGuard>
  );
}
