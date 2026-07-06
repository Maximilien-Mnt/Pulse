import { cn } from "@/utils/format";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, TextInput, View } from "react-native";

type Props = {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  onPress?: () => void;
  expanded?: boolean;
  className?: string;
};

export function SearchBar({
  value,
  onChangeText,
  placeholder = "Rechercher…",
  onPress,
  expanded,
  className,
}: Props) {
  if (onPress && !expanded) {
    return (
      <Pressable
        onPress={onPress}
        className={cn(
          "flex-row items-center bg-neutral-100 dark:bg-neutral-800 rounded-xl px-3 py-2.5",
          className
        )}
      >
        <Ionicons name="search-outline" size={20} color="#94A3B8" />
        <Text className="ml-2 flex-1 text-base text-neutral-500">{placeholder}</Text>
      </Pressable>
    );
  }
  return (
    <View className={cn("flex-row items-center bg-neutral-100 dark:bg-neutral-800 rounded-xl px-3 py-2.5", className)}>
      <Ionicons name="search-outline" size={20} color="#94A3B8" />
      <TextInput
        className="ml-2 flex-1 text-base text-neutral-900 dark:text-neutral-50"
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        value={value}
        onChangeText={onChangeText}
      />
    </View>
  );
}
