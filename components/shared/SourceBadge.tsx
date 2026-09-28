import { Icon, type IconColor } from "@/components/ui/Icon";
import { cn } from "@/utils/format";
import { View, Text } from "react-native";
import { useTranslation } from "@/hooks/useTranslation";
import type { TranslationKey } from "@/lib/translations";
type SourceState = "inApp" | "external";

type Props = {
  /** True when the club/event was fetched from an external source (API/website). */
  isExternal?: boolean;
  /** "chip" renders a compact icon + short label pill (cards); "full" renders icon + full state name (detail screens). Default: "full". */
  variant?: "chip" | "full";
  className?: string;
};

const STATE: Record<
  SourceState,
  {
    icon: "Smartphone" | "Globe";
    /** Long label — used by the "full" variant and as the accessibility label. */
    labelKey: TranslationKey;
    /** Short label — used by the "chip" variant so cards stay readable at a glance. */
    shortKey: TranslationKey;
    chip: string;
    text: string;
    color: IconColor;
    border: string;
  }
> = {
  inApp: {
    icon: "Smartphone",
    labelKey: "source.inApp",
    shortKey: "source.inAppShort",
    chip: "bg-primary/10",
    text: "text-primary",
    color: "primary",
    border: "border-primary/20",
  },
  external: {
    icon: "Globe",
    labelKey: "source.external",
    shortKey: "source.externalShort",
    chip: "bg-warning/15",
    text: "text-warning",
    color: "warning-500",
    border: "border-warning/40",
  },
};

/**
 * Indicates whether a club/event was created inside the app (by a profile)
 * or imported from an external source (API/website sync) — i.e. whether the
 * registration workflow happens in-app or outside Pulse.
 *
 * Both variants expose an accessibility label describing the full state so
 * screen readers get the complete meaning regardless of the visible label.
 */
export function SourceBadge({ isExternal, variant = "full", className }: Props) {
  const { t } = useTranslation();
  const state = STATE[isExternal ? "external" : "inApp"];
  const a11yLabel = t(state.labelKey);

  if (variant === "chip") {
    return (
      <View
        className={cn(
          "h-6 flex-row items-center gap-1 px-2 rounded-full border",
          state.chip,
          state.border,
          className
        )}
        accessible
        accessibilityLabel={a11yLabel}
      >
        <Icon name={state.icon} size={12} color={state.color} />
        <Text className={cn("text-[11px] font-semibold", state.text)} numberOfLines={1}>
          {t(state.shortKey)}
        </Text>
      </View>
    );
  }

  return (
    <View
      className={cn(
        "flex-row items-center gap-1.5 px-2.5 py-1 rounded-full self-start border",
        state.chip,
        state.border,
        className
      )}
      accessible
      accessibilityLabel={a11yLabel}
    >
      <Icon name={state.icon} size={16} color={state.color} />
      <Text className={cn("text-xs font-semibold", state.text)}>{t(state.labelKey)}</Text>
    </View>
  );
}