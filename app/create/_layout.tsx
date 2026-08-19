import { Stack } from "expo-router";
import { AuthGuard } from "@/components/shared/AuthGuard";

export default function CreateLayout() {
  return (
    <AuthGuard>
      <Stack screenOptions={{ headerShown: false }} />
    </AuthGuard>
  );
}