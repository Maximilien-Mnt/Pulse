import { cn } from "@/utils/format";
import type { ComponentProps, ReactNode } from "react";
import { Pressable, View } from "react-native";
import type { AccessibilityLabelProps, AccessibilityHintProps } from "@/src/accessibility";
import { Icon } from "./Icon";

type Props = AccessibilityLabelProps &
  AccessibilityHintProps & {
  children: ReactNode;
  className?: string;
  onPress?: () => void;
  hitSlop?: ComponentProps<typeof Pressable>["hitSlop"];
  /** Border color - defaults to primary */
  borderColor?: string;
  /** Show border on all sides */
  bordered?: boolean;
  /** Additional padding for better touch target */
  padded?: boolean;
  /** Test identifier for E2E and unit tests. */
  testID?: string;
};

/**
 * A row component with full-width pressable area, clear borders, and proper touch targets.
 * Use this for list items, selection rows, and any clickable content that needs clear boundaries.
 */
export function PressableRow({
  children,
  className,
  onPress,
  hitSlop,
  borderColor = "#1E6BFF",
  bordered = true,
  padded = true,
  accessibilityLabel,
  accessibilityHint,
  testID,
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
        hitSlop={hitSlop}
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        accessible={accessibilityLabel != null}
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
