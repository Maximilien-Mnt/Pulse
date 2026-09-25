// ---------------------------------------------------------------------------
// PULSE PROFILE — ProfileTopActions
//
// Top-right expanding round icon buttons over the profile cover:
// Notifications (Bell) + Settings (Settings). Collapsed they are round
// glass chips (like ClubHeroBar); on web hover / keyboard focus they get
// wider and reveal their localized name. On native / reduced-motion they
// stay plain round icon buttons with the name exposed via
// accessibilityLabel.
// ---------------------------------------------------------------------------

import React, { useRef, useState } from "react";
import { Animated, Easing, Platform, Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Text } from "@/components/ui/Text";
import { t } from "@/hooks/useTranslation";
import { useReducedMotion } from "@/hooks/useReducedMotion";

const COLLAPSED = 44;
const PADDING_X = 14;
const GAP = 8;
const ICON_SIZE = 20;
const DURATION = 160;

function ExpandingTopButton({
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
  const width = useRef(new Animated.Value(COLLAPSED)).current;
  const labelOpacity = useRef(new Animated.Value(0)).current;
  const [labelW, setLabelW] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const expandedRef = useRef(false);

  const targetWidth = COLLAPSED + (labelW > 0 ? PADDING_X + GAP + labelW : 0);

  const setTo = (next: boolean) => {
    if (expandedRef.current === next) return;
    expandedRef.current = next;
    setExpanded(next);
    const toWidth = next ? targetWidth : COLLAPSED;
    if (reduceMotion) {
      width.setValue(toWidth);
      labelOpacity.setValue(next ? 1 : 0);
      return;
    }
    Animated.parallel([
      Animated.timing(width, {
        toValue: toWidth,
        duration: DURATION,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }),
      Animated.timing(labelOpacity, {
        toValue: next ? 1 : 0,
        duration: DURATION,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  };

  // When the label width is first measured while expanded, snap the
  // container to the correct expanded width.
  const handleLabelLayout = (w: number) => {
    if (w > 0 && w !== labelW) {
      setLabelW(w);
      if (expandedRef.current) {
        width.setValue(COLLAPSED + PADDING_X + GAP + w);
      }
    }
  };

  const isWeb = Platform.OS === "web";

  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={expanded ? { expanded: true } : undefined}
      hitSlop={8}
      onHoverIn={isWeb ? () => setTo(true) : undefined}
      onHoverOut={isWeb ? () => setTo(false) : undefined}
      onFocus={() => setTo(true)}
      onBlur={() => setTo(false)}
    >
      <Animated.View
        style={{ width, height: COLLAPSED }}
        className="flex-row items-center overflow-hidden rounded-full bg-black/35 border border-white/30 active:bg-black/50"
      >
        {/* Label pinned left; icon pinned right so the right edge never moves */}
        <View className="flex-row items-center flex-1" style={{ paddingLeft: PADDING_X }}>
          <Animated.View
            style={{ opacity: labelOpacity }}
            onLayout={(e) => handleLabelLayout(e.nativeEvent.layout.width)}
          >
            <Text
              variant="buttonLabel"
              numberOfLines={1}
              className="text-white"
              style={{ marginRight: GAP, flexShrink: 0 }}
            >
              {label}
            </Text>
          </Animated.View>
        </View>
        <View style={{ width: COLLAPSED, height: COLLAPSED }} className="items-center justify-center shrink-0">
          <Icon name={icon} size={ICON_SIZE} color="white" />
        </View>
      </Animated.View>
    </Pressable>
  );
}

export function ProfileTopActions() {
  const router = useRouter();
  return (
    <View className="absolute top-3 right-3 flex-row items-start justify-end gap-2">
      <ExpandingTopButton
        icon="Bell"
        label={t("profile.notificationsSection")}
        onPress={() => router.push("/(tabs)/profile/notifications" as never)}
        testID="profile-top-notifications"
      />
      <ExpandingTopButton
        icon="Settings"
        label={t("profile.settings")}
        onPress={() => router.push("/(tabs)/profile/settings" as never)}
        testID="profile-top-settings"
      />
    </View>
  );
}
