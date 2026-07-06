import { cn } from "@/utils/format";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

type Props = {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  error?: string;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address" | "numeric" | "number-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  multiline?: boolean;
  className?: string;
};

export function Input({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  multiline,
  className,
}: Props) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  const showToggle = !!secureTextEntry;
  const borderClass = error
    ? "border-error"
    : focused
      ? "border-primary"
      : "border-neutral-200 dark:border-neutral-700";

  return (
    <View className={cn("mb-4", className)}>
      <Text className="text-sm font-medium text-neutral-800 dark:text-neutral-100 mb-1">{label}</Text>
      <View
        className={cn(
          "border-2 rounded-xl px-3.5 py-3.5 bg-white dark:bg-neutral-900 flex-row items-center",
          borderClass
        )}
      >
        <TextInput
          className="flex-1 text-base text-neutral-900 dark:text-neutral-50"
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry && hidden}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          multiline={multiline}
          textAlignVertical={multiline ? "top" : "center"}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {showToggle ? (
          <Pressable onPress={() => setHidden((h) => !h)} hitSlop={8}>
            <Ionicons name={hidden ? "eye-off-outline" : "eye-outline"} size={22} color="#64748B" />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text className="text-sm text-error mt-1">{error}</Text> : null}
    </View>
  );
}
