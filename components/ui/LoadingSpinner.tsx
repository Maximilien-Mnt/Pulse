import { COLORS } from "@/lib/constants";
import { ActivityIndicator, View } from "react-native";

type Props = {
  size?: "small" | "large";
  /** Custom accessible label. Defaults to "Chargement…". */
  accessibilityLabel?: string;
  /** Test identifier for E2E and unit tests. */
  testID?: string;
};

export function LoadingSpinner({ size = "small", accessibilityLabel, testID }: Props) {
  return (
    <View className="items-center justify-center p-2" testID={testID} accessible accessibilityLabel={accessibilityLabel ?? "Chargement…"}>
      <ActivityIndicator color={COLORS.primary} size={size} />
    </View>
  );
}
