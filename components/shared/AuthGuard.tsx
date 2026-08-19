import { ReactNode } from "react";
import { View, ActivityIndicator } from "react-native";
import { Redirect } from "expo-router";
import { useAuthStore } from "@/stores/authStore";

import { Text } from "@/components/ui/Text";

export function AuthGuard({ children }: { children: ReactNode }) {
  const initialized = useAuthStore((s) => s.initialized);
  const userId = useAuthStore((s) => s.userId);

  if (!initialized) {
    return (
      <View className="flex-1 items-center justify-center bg-bg dark:bg-[#0A0F1E]">
        <ActivityIndicator />
      </View>
    );
  }

  if (!userId) {
    return <Redirect href="/auth/signin" />;
  }

  return <>{children}</>;
}