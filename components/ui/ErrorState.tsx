import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { Button } from "./Button";

type Props = {
  message: string;
  onRetry?: () => void;
};

export function ErrorState({ message, onRetry }: Props) {
  return (
    <View className="items-center justify-center py-12 px-6">
      <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
      <Text className="text-base text-neutral-700 dark:text-neutral-200 mt-4 text-center">{message}</Text>
      {onRetry ? (
        <View className="mt-6 w-full max-w-xs">
          <Button title="Réessayer" onPress={onRetry} variant="secondary" />
        </View>
      ) : null}
    </View>
  );
}
