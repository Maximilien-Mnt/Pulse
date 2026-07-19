import { useTagSuggestions } from "@/hooks/useTagSuggestions";
import { FlatList, Pressable, Text, TextInput, View } from "react-native";

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
};

/**
 * Text input with # prefix and live suggestions from existing posts.tags
 * (deduped, top 10 by frequency).
 */
export function TagInput({ value, onChangeText, placeholder = "#course #club" }: Props) {
  const suggestions = useTagSuggestions(value);

  return (
    <View>
      <View className="flex-row items-center border-2 border-neutral-200 dark:border-neutral-700 rounded-xl px-3">
        <Text className="text-neutral-500 dark:text-neutral-400 text-base mr-1">#</Text>
        <TextInput
          className="flex-1 py-3 text-base text-neutral-900 dark:text-neutral-50"
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>
      {suggestions.length > 0 ? (
        <FlatList
          data={suggestions}
          keyExtractor={(s) => s.tag}
          className="mt-1 border border-neutral-200 dark:border-neutral-700 rounded-xl"
          renderItem={({ item }) => (
            <Pressable
              className="px-3 py-2 border-b border-neutral-100 dark:border-neutral-800"
              onPress={() => {
                // Replace the current word (last word) with the suggestion
                const parts = value.split(/[\s,]+/);
                parts.pop();
                parts.push(item.tag);
                onChangeText(parts.join(", "));
              }}
            >
              <Text className="text-sm text-neutral-800 dark:text-neutral-100">
                #{item.tag}
              </Text>
              <Text className="text-xs text-neutral-400">{item.count} posts</Text>
            </Pressable>
          )}
        />
      ) : null}
    </View>
  );
}