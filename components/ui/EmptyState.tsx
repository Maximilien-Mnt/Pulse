import { cn } from "@/utils/format";
import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { Button } from "./Button";
import { Icon, type IconName } from "./Icon";

type Props = {
  icon: IconName;
  title: string;
  subtitle?: string;
  ctaLabel?: string;
  onCta?: () => void;
  children?: ReactNode;
};

export function EmptyState({ icon, title, subtitle, ctaLabel, onCta, children }: Props) {
  return (
    <View className="items-center justify-center py-12 px-6">
      <Icon name={icon} size={32} color="text-tertiary" />
      <Text className="text-xl font-semibold text-neutral-900 dark:text-neutral-50 mt-4 text-center">
        {title}
      </Text>
      {subtitle ? (
        <Text className="text-base text-neutral-500 dark:text-neutral-400 mt-2 text-center">
          {subtitle}
        </Text>
      ) : null}
      {ctaLabel && onCta ? (
        <View className={cn("mt-6 w-full max-w-xs")}>
          <Button title={ctaLabel} onPress={onCta} />
        </View>
      ) : null}
      {children}
    </View>
  );
}
