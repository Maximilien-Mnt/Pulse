import { Text, View } from "react-native";
import { Button } from "./Button";
import { Icon } from "./Icon";
import { t } from "@/hooks/useTranslation";

type Props = {
  /** Non-technical message shown to the user. Never pass raw error objects. */
  message: string;
  /** Optional heading above the message. */
  title?: string;
  onRetry?: () => void;
  retryLabel?: string;
  testID?: string;
};

export function ErrorState({ message, title, onRetry, retryLabel, testID }: Props) {
  return (
    <View className="items-center justify-center py-12 px-6" testID={testID}>
      <Icon name="AlertCircle" size={32} color="error-500" decorative />
      {title ? (
        <Text
          className="text-xl font-semibold text-neutral-900 dark:text-neutral-50 mt-4 text-center"
          role="heading"
          accessibilityRole="header"
          accessibilityLevel={2}
        >
          {title}
        </Text>
      ) : null}
      <Text
        className="text-base text-neutral-700 dark:text-neutral-200 mt-2 text-center"
        accessible
        accessibilityRole="alert"
        accessibilityLabel={title ? `${title}. ${message}` : message}
      >
        {message}
      </Text>
      {onRetry ? (
        <View className="mt-6 w-full max-w-xs">
          <Button
            title={retryLabel ?? t("common.retry")}
            onPress={onRetry}
            variant="secondary"
            testID={testID ? `${testID}-retry` : undefined}
          />
        </View>
      ) : null}
    </View>
  );
}
