import { cn } from "@/utils/format";
import type { ReactNode } from "react";
import { Pressable, View } from "react-native";

type Props = {
  children: ReactNode;
  className?: string;
  onPress?: () => void;
  /** Border color - defaults to primary */
  borderColor?: string;
  /** Show border on all sides */
  bordered?: boolean;
  /** Additional padding for better touch target */
  padded?: boolean;
};

/**
 * A row component with full-width pressable area, clear borders, and proper touch targets.
 * Use this for list items, selection rows, and any clickable content that needs clear boundaries.
 */
export function PressableRow({
  children,
  className,
  onPress,
  borderColor = "#1E6BFF",
  bordered = true,
  padded = true,
}: Props) {
  const containerClass = cn(
    "bg-white dark:bg-neutral-800 rounded-xl overflow-hidden",
    bordered && "border",
    padded && "p-3",
    className
  );

  const style = bordered ? { borderColor } : undefined;

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        className={cn(containerClass, "active:opacity-80")}
        style={style}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View className={containerClass} style={style}>
      {children}
    </View>
  );
}
