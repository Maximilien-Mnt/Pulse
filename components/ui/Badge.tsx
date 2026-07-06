import { cn } from "@/utils/format";
import { Text, View } from "react-native";

type Props = {
  children: string;
  variant?: "primary" | "neutral" | "warning";
  className?: string;
};

export function Badge({ children, variant = "primary", className }: Props) {
  const map: Record<string, string> = {
    primary: "bg-primary/10",
    neutral: "bg-neutral-100 dark:bg-neutral-700",
    warning: "bg-warning/15",
  };
  const text: Record<string, string> = {
    primary: "text-primary",
    neutral: "text-neutral-700 dark:text-neutral-100",
    warning: "text-warning",
  };
  return (
    <View className={cn("px-2 py-1 rounded-full self-start", map[variant], className)}>
      <Text className={cn("text-xs font-semibold", text[variant])}>{children}</Text>
    </View>
  );
}
