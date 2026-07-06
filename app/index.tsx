import { useAuth } from "@/hooks/useAuth";
import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";

export default function Index() {
  const { initialized, userId } = useAuth();

  if (!initialized) {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-50 dark:bg-[#0A0F1E]">
        <ActivityIndicator />
      </View>
    );
  }

  if (!userId) {
    return <Redirect href="/auth/signin" />;
  }
  return <Redirect href="/(tabs)/feed" />;
}
