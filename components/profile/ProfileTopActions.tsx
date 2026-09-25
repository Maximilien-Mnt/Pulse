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
//     the chevron nudges right; on press feedback follows the Card pattern.
// ---------------------------------------------------------------------------

import React, { useRef, useState } from "react";
import { Animated, Easing, Platform, Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Text } from "@/components/ui/Text";
import { t } from "@/hooks/useTranslation";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/utils/format";

const LINK_MIN_W = 220;
const CHEVRON_NUDGE = 4;
const DURATION = 150;

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
  const reduceMotion = useReducedMotion();
  const chevronX = useRef(new Animated.Value(0)).current;
  const [active, setActive] = useState(false);
  const activeRef = useRef(false);

  const setTo = (next: boolean) => {
    if (activeRef.current === next) return;
    activeRef.current = next;
    setActive(next);
    if (reduceMotion) {
      chevronX.setValue(next ? CHEVRON_NUDGE : 0);
      return;
    }
    Animated.timing(chevronX, {
      toValue: next ? CHEVRON_NUDGE : 0,
      duration: DURATION,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  };

  const isWeb = Platform.OS === "web";

  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={active ? { expanded: true } : undefined}
      hitSlop={4}
      onHoverIn={isWeb ? () => setTo(true) : undefined}
      onHoverOut={isWeb ? () => setTo(false) : undefined}
      onFocus={() => setTo(true)}
      onBlur={() => setTo(false)}
      style={{ minWidth: LINK_MIN_W }}
      className={cn(
        "flex-1 flex-row items-center gap-3 rounded-xl border p-4",
        "bg-surface dark:bg-surface-dark border-border dark:border-border-dark",
        "active:bg-primary-tint dark:active:bg-primary-tint-dark",
        active && "bg-primary-tint dark:bg-primary-tint-dark"
      )}
    >
      <View className="w-10 h-10 shrink-0 rounded-full bg-primary/10 items-center justify-center">
        <Icon name={icon} size={20} color="primary" />
      </View>
      <Text variant="buttonLabel" numberOfLines={1} className="flex-1 text-text-secondary">
        {label}
      </Text>
      <Animated.View style={{ transform: [{ translateX: chevronX }] }}>
        <Icon name="ChevronRight" size={20} color="text-tertiary" />
      </Animated.View>
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
