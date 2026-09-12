import { COLORS } from "@/lib/constants";
import { ActivityIndicator, View } from "react-native";
import { t } from "@/hooks/useTranslation";

type Props = {
  size?: "small" | "large";
  /** Custom accessible label. Defaults to the localized loading string. */
  accessibilityLabel?: string;
  /** Test identifier for E2E and unit tests. */
  testID?: string;
};

export function LoadingSpinner({ size = "small", accessibilityLabel, testID }: Props) {
  return (
    <View className="items-center justify-center p-2" testID={testID} accessible accessibilityLabel={accessibilityLabel ?? t("common.loading")}>
      <ActivityIndicator color={COLORS.primary} size={size} />
    </View>
  );
}
