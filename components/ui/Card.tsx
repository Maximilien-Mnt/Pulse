import { cn } from "@/utils/format";
import type { ReactNode } from "react";
import { Pressable, View } from "react-native";

type Props = {
  children: ReactNode;
  className?: string;
  onPress?: () => void;
};

export function Card({ children, className, onPress }: Props) {
  const cls = cn(
    "bg-white dark:bg-neutral-800 rounded-2xl shadow-sm overflow-hidden",
    className
  );
  if (onPress) {
    return (
      <Pressable onPress={onPress} className={cn(cls, "active:opacity-95")}>
        {children}
      </Pressable>
    );
  }
  return <View className={cls}>{children}</View>;
}
