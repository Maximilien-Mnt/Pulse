import { Text, View } from "react-native";
import { Button } from "./Button";
import { Icon } from "./Icon";

type Props = {
  message: string;
  onRetry?: () => void;
};

export function ErrorState({ message, onRetry }: Props) {
  return (
    <View className="items-center justify-center py-12 px-6">
      <Icon name="AlertCircle" size={32} color="error-500" />
      <Text className="text-base text-neutral-700 dark:text-neutral-200 mt-4 text-center">{message}</Text>
      {onRetry ? (
        <View className="mt-6 w-full max-w-xs">
          <Button title="Réessayer" onPress={onRetry} variant="secondary" />
        </View>
      ) : null}
    </View>
  );
}
