import { Icon, type IconColor } from "@/components/ui/Icon";
import { cn } from "@/utils/format";
import { View, Text } from "react-native";

type SourceState = "inApp" | "external";

type Props = {
  /** True when the club/event was fetched from an external source (API/website). */
  isExternal?: boolean;
  /** "chip" renders only an icon (cards); "full" renders icon + state name (detail screens). Default: "full". */
  variant?: "chip" | "full";
  className?: string;
};

const STATE: Record<SourceState, { icon: "Smartphone" | "Globe"; label: string; chip: string; text: string; color: IconColor }> = {
  inApp: {
    icon: "Smartphone",
    label: "Créé dans l'app",
    chip: "bg-primary/10",
    text: "text-primary",
    color: "primary",
  },
  external: {
    icon: "Globe",
    label: "Source externe",
    chip: "bg-warning/15",
    text: "text-warning",
    color: "warning-500",
  },
};

/**
 * Indicates whether a club/event was created inside the app (by a profile)
 * or imported from an external source (API/website sync).
 */
export function SourceBadge({ isExternal, variant = "full", className }: Props) {
  const state = STATE[isExternal ? "external" : "inApp"];

  if (variant === "chip") {
    return (
      <View className={cn("h-6 w-6 rounded-full items-center justify-center", state.chip, className)}>
        <Icon name={state.icon} size={16} color={state.color} />
      </View>
    );
  }

  return (
    <View className={cn("flex-row items-center gap-1.5 px-2.5 py-1 rounded-full self-start", state.chip, className)}>
      <Icon name={state.icon} size={16} color={state.color} />
      <Text className={cn("text-xs font-semibold", state.text)}>{state.label}</Text>
    </View>
  );
}