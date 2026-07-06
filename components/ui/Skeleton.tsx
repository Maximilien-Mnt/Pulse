import { cn } from "@/utils/format";
import { View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

type Props = {
  className?: string;
  height?: number;
};

export function Skeleton({ className, height = 16 }: Props) {
  return (
    <Animated.View entering={FadeIn} className={cn("rounded-lg bg-neutral-200 dark:bg-neutral-700", className)} style={{ height }} />
  );
}
