import { COLORS } from "@/lib/constants";
import { ActivityIndicator, View } from "react-native";

type Props = {
  size?: "small" | "large";
};

export function LoadingSpinner({ size = "small" }: Props) {
  return (
    <View className="items-center justify-center p-2">
      <ActivityIndicator color={COLORS.primary} size={size} />
    </View>
  );
}
