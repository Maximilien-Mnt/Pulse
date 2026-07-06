import { cn } from "@/utils/format";
import { Pressable, Text, View } from "react-native";

type Props = {
  label: string;
  onPress?: () => void;
  selected?: boolean;
};

export function Tag({ label, onPress, selected }: Props) {
  const cls = cn(
    "px-3 py-1 rounded-full mr-2 mb-2 self-start",
    selected ? "bg-primary" : "bg-primary/10"
  );
  const textCls = cn("text-sm font-medium", selected ? "text-white" : "text-primary");
  if (onPress) {
    return (
      <Pressable onPress={onPress} className={cls}>
        <Text className={textCls}>{label}</Text>
      </Pressable>
    );
  }
  return (
    <View className={cls}>
      <Text className={textCls}>{label}</Text>
    </View>
  );
}
