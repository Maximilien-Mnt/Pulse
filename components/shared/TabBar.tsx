import { COLORS } from "@/lib/constants";
import { cn } from "@/utils/format";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useSegments } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Pressable, Text, View } from "react-native";

const TAB = [
  { key: "feed", href: "/(tabs)/feed", label: "Social", inactive: "home-outline" as const, active: "home" as const },
  { key: "clubs", href: "/(tabs)/clubs", label: "Clubs", inactive: "people-outline" as const, active: "people" as const },
  { key: "events", href: "/(tabs)/events", label: "Évènements", inactive: "calendar-outline" as const, active: "calendar" as const },
  { key: "conversations", href: "/(tabs)/conversations", label: "Messages", inactive: "chatbubbles-outline" as const, active: "chatbubbles" as const },
];

export function TabBar(_props: BottomTabBarProps) {
  const router = useRouter();
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const path = segments.join("/");

  const isActive = (key: string) => {
    if (key === "feed") return path.includes("feed");
    if (key === "clubs") return path.includes("clubs");
    if (key === "events") return path.includes("events");
    if (key === "conversations") return path.includes("conversations");
    return false;
  };

  return (
    <View
      className="bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 flex-row items-end justify-between px-2"
      style={{ paddingBottom: Math.max(insets.bottom, 8), height: 70 + insets.bottom }}
    >
      {TAB.slice(0, 2).map((t) => {
        const on = isActive(t.key);
        return (
          <Pressable key={t.key} onPress={() => router.push(t.href)} className="items-center flex-1 pb-1">
            <Ionicons name={on ? t.active : t.inactive} size={24} color={on ? COLORS.primary : COLORS.inactiveTab} />
            <Text
              className={cn(
                "text-xs mt-1",
                on ? "text-primary font-medium" : "text-neutral-400"
              )}
            >
              {t.label}
            </Text>
          </Pressable>
        );
      })}

      <View className="w-16 items-center">
        <Pressable
          onPress={() => router.push("/(tabs)/create")}
          className="w-14 h-14 rounded-full bg-primary items-center justify-center shadow-lg -mt-6"
        >
          <Ionicons name="add" size={32} color="#fff" />
        </Pressable>
      </View>

      {TAB.slice(2).map((t) => {
        const on = isActive(t.key);
        return (
          <Pressable key={t.key} onPress={() => router.push(t.href)} className="items-center flex-1 pb-1">
            <Ionicons name={on ? t.active : t.inactive} size={24} color={on ? COLORS.primary : COLORS.inactiveTab} />
            <Text className={cn("text-xs mt-1", on ? "text-primary font-medium" : "text-neutral-400")}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
