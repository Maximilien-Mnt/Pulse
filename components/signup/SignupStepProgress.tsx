import { View } from "react-native";
import { Text } from "@/components/ui/Text";
import { useTranslation , t } from "@/hooks/useTranslation";

type Props = {
  /** Current step (1-based). */
  step: number;
  /** Total number of steps. Defaults to 5. */
  total?: number;
};

/**
 * Localized "Step n of m" label plus a segmented progress bar, rendered under
 * the shared Header on every step of the signup flow.
 */
export function SignupStepProgress({ step, total = 5 }: Props) {
  const { t } = useTranslation();

  return (
    <View className="px-6 pb-4">
      <Text variant="caption">
        {t("signup.stepCount", { current: step, total })}
      </Text>
      <View className="flex-row gap-1.5 mt-2">
        {Array.from({ length: total }, (_, i) => {
          const done = i < step;
          return (
            <View
              key={i}
              className={`flex-1 h-1.5 rounded-full ${
                done ? "bg-primary dark:bg-primary/20" : "bg-neutral-200 dark:bg-neutral-700"
              }`}
            />
          );
        })}
      </View>
    </View>
  );
}