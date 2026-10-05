// ---------------------------------------------------------------------------
// PULSE PROFILE — ProfileTopActions
//
// Link-button cards to the Notifications and Settings screens, placed just
// above the stats grid (StatsGrid) on the personal profile screen:
//   - each card holds the screen icon, its localized name, and a chevron,
//   - side-by-side on wide-enough screens (container width >= LINK_MIN_W),
//     stacked otherwise — driven by onLayout so the same component adapts
//     on native and web without breakpoints,
//   - on web hover / keyboard focus the card shifts to its hover tint and
//     the chevron nudges right (shared <Arrow> micro-interaction, see
//     components/ui/Arrow.tsx); on press feedback follows the Card pattern.
// ---------------------------------------------------------------------------

import React, { useState } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { Arrow, useArrowNudge } from "@/components/ui/Arrow";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Text } from "@/components/ui/Text";
import { t } from "@/hooks/useTranslation";
import { cn } from "@/utils/format";

const LINK_MIN_W = 220;

function LinkActionCard({
  icon,
  label,
  onPress,
  testID,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  testID?: string;
}) {
  const { active, ...nudge } = useArrowNudge();

  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={active ? { expanded: true } : undefined}
      hitSlop={4}
      {...nudge}
      style={{ minWidth: LINK_MIN_W }}
      className={cn(
        "flex-1 flex-row items-center gap-3 rounded-xl border p-4",
        "border-border dark:border-border-dark",
        // Base surface and hover tint are mutually exclusive: `bg-surface` /
        // `dark:bg-surface-dark` are emitted AFTER `bg-primary-tint` in the
        // generated web CSS, so keeping both would hide the tint on hover.
        active
          ? "bg-primary-tint dark:bg-primary-tint-dark"
          : "bg-surface dark:bg-surface-dark",
        "active:bg-primary-tint dark:active:bg-primary-tint-dark"
      )}
    >
      <View className="w-10 h-10 shrink-0 rounded-full bg-primary/10 items-center justify-center">
        <Icon name={icon} size={20} color="primary" />
      </View>
      <Text variant="buttonLabel" numberOfLines={1} className="flex-1 text-text-secondary">
        {label}
      </Text>
      <Arrow active={active} name="ChevronRight" size={20} color="text-tertiary" />
    </Pressable>
  );
}

export function ProfileTopActions() {
  const router = useRouter();
  const [narrow, setNarrow] = useState(false);

  return (
    <View
      testID="profile-top-actions"
      onLayout={(e) => setNarrow(e.nativeEvent.layout.width < LINK_MIN_W * 2 + 12)}
      className={cn("mt-6 gap-3", narrow ? "flex-col" : "flex-row")}
    >
      <LinkActionCard
        icon="Bell"
        label={t("profile.notificationsSection")}
        onPress={() => router.push("/(tabs)/profile/notifications" as never)}
        testID="profile-top-notifications"
      />
      <LinkActionCard
        icon="Settings"
        label={t("profile.settings")}
        onPress={() => router.push("/(tabs)/profile/settings" as never)}
        testID="profile-top-settings"
      />
    </View>
  );
}
