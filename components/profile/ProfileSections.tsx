// ---------------------------------------------------------------------------
// PULSE PROFILE — SHARED PROFILE SECTIONS
//
// Reusable, clean UI/UX sections used by every profile screen (own tab profile,
// "Mon profil public", and other users' public profiles) so the content is
// always presented identically:
//   - StatsGrid          : visibility-gated stat tiles (6 when public, 2 when private)
//   - SportStatusCard    : practiced sports with level / practice / availability
//   - InterestedSportsCard : sports the user is interested in
//   - ObjectivesCard     : the user's goals
// ---------------------------------------------------------------------------

import React from "react";
import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { Tag } from "@/components/ui/Tag";
import { Text } from "@/components/ui/Text";
import { SPORTS, WEEKDAYS } from "@/lib/constants";
import type { UserStats, UserSport, PublicStatusMap } from "@/types";
import { cn } from "@/utils/format";

function formatHour(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

// ---------------------------------------------------------------------------
// Stats grid
// ---------------------------------------------------------------------------

export function StatsGrid({
  stats,
  isPublic,
}: {
  stats: UserStats | null;
  isPublic: boolean;
}) {
  const items = isPublic
    ? [
        { label: "Abonnés", value: stats?.followers_count ?? 0, icon: "Users" as const },
        { label: "Posts", value: stats?.posts_count ?? 0, icon: "FileText" as const },
        { label: "Clubs", value: stats?.clubs_created_count ?? 0, icon: "Calendar" as const },
        { label: "Events", value: stats?.events_created_count ?? 0, icon: "Calendar" as const },
        { label: "Likes", value: stats?.total_likes_received ?? 0, icon: "Heart" as const },
        { label: "Commentaires", value: stats?.total_comments_received ?? 0, icon: "MessageSquare" as const },
      ]
    : [
        { label: "Clubs", value: stats?.clubs_created_count ?? 0, icon: "Calendar" as const },
        { label: "Events", value: stats?.events_created_count ?? 0, icon: "Calendar" as const },
      ];

  return (
    <View className={cn("flex-row mt-6 gap-3", isPublic && "flex-wrap justify-between")}>
      {items.map((item) => (
        <View
          key={item.label}
          className={cn(
            isPublic ? "w-[31%]" : "flex-1",
            "bg-neutral-50 dark:bg-neutral-800/60 rounded-xl border border-border dark:border-border-dark p-3 items-center"
          )}
        >
          <Icon name={item.icon} size={20} color="primary" />
          <Text className="text-base font-bold text-neutral-900 dark:text-neutral-50 mt-1">
            {item.value}
          </Text>
          <Text className="text-[10px] text-neutral-500">{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Sports & statuts (practiced sports with level / practice / availability)
// ---------------------------------------------------------------------------

export function SportStatusCard({
  sports,
  statusMap,
  onEditPress,
}: {
  sports: UserSport[];
  statusMap: PublicStatusMap;
  onEditPress?: () => void;
}) {
  if (sports.length === 0) return null;

  return (
    <Card className="mt-5 p-4">
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-lg font-semibold">Sports & statuts</Text>
        {onEditPress ? (
          <Pressable onPress={onEditPress} hitSlop={8} accessibilityRole="button" accessibilityLabel="Modifier les sports pratiqués">
            <Icon name="Pen" size={20} color="text-tertiary" />
          </Pressable>
        ) : null}
      </View>
      <View className="gap-4">
        {sports.map((s) => {
          const sportDef = SPORTS.find((x) => x.id === s.sport_id);
          const timeSlots =
            (s.time_slots as { weekday: number; startHour: number; endHour: number }[] | undefined) ?? [];

          return (
            <View
              key={s.id}
              className="border-b border-border dark:border-border-dark last:border-b-0 pb-3 last:pb-0"
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                  <View
                    className="w-8 h-8 rounded-full items-center justify-center"
                    style={{ backgroundColor: `${sportDef?.color ?? "#3358FF"}20` }}
                  >
                    <Ionicons
                      name={(sportDef?.icon ?? "help-outline") as any}
                      size={18}
                      color={sportDef?.color ?? "#3358FF"}
                    />
                  </View>
                  <Text className="text-sm font-medium text-neutral-800 dark:text-neutral-100">
                    {sportDef?.label ?? s.sport_id}
                  </Text>
                </View>
                <Badge>{statusMap[s.sport_id] ?? "—"}</Badge>
              </View>

              <View className="flex-row flex-wrap gap-2 mt-2">
                <Tag size="sm">{s.level}</Tag>
                <Tag size="sm" tone="neutral">
                  {s.practice}
                </Tag>
              </View>

              {timeSlots.length > 0 && (
                <View className="flex-row flex-wrap gap-1.5 mt-2.5">
                  {timeSlots.map((slot, idx) => (
                    <View key={idx} className="px-2 py-1 rounded-md bg-neutral-100 dark:bg-neutral-700/70">
                      <Text className="text-[11px] text-neutral-600 dark:text-neutral-200">
                        {WEEKDAYS[slot.weekday] ?? ""} {formatHour(slot.startHour)}-{formatHour(slot.endHour)}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </View>
    </Card>
  );
}
// ---------------------------------------------------------------------------
// Sports qui m'intéressent
// ---------------------------------------------------------------------------

export function InterestedSportsCard({
  sports,
  onEditPress,
}: {
  sports: string[];
  onEditPress?: () => void;
}) {
  const list = (sports ?? []).filter(Boolean);
  if (list.length === 0) return null;

  return (
    <Card className="mt-4 p-4">
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center gap-2">
          <Icon name="Heart" size={20} color="accent" />
          <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
            Sports qui m’intéressent
          </Text>
        </View>
        {onEditPress ? (
          <Pressable onPress={onEditPress} hitSlop={8} accessibilityRole="button" accessibilityLabel="Modifier les sports qui m'intéressent">
            <Icon name="Pen" size={20} color="text-tertiary" />
          </Pressable>
        ) : null}
      </View>
      <View className="flex-row flex-wrap gap-2">
        {list.map((sid) => {
          const sportDef = SPORTS.find((x) => x.id === sid);
          const label = sportDef?.label ?? sid;
          return (
            <Tag key={sid} size="sm" className="pl-2.5 pr-3">
              <View className="flex-row items-center gap-1.5">
                <Ionicons
                  name={(sportDef?.icon ?? "help-outline") as any}
                  size={14}
                  color={sportDef?.color ?? "#3358FF"}
                />
                <Text className="text-xs font-medium text-neutral-800 dark:text-neutral-100">{label}</Text>
              </View>
            </Tag>
          );
        })}
      </View>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Mes objectifs
// ---------------------------------------------------------------------------

export function ObjectivesCard({
  objectives,
  onEditPress,
}: {
  objectives: { id: string; objective: string }[];
  onEditPress?: () => void;
}) {
  if (!objectives || objectives.length === 0) return null;

  return (
    <Card className="mt-4 p-4">
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center gap-2">
          <Icon name="CheckCircle2" size={20} color="success" />
          <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-50">Mes objectifs</Text>
        </View>
        {onEditPress ? (
          <Pressable onPress={onEditPress} hitSlop={8} accessibilityRole="button" accessibilityLabel="Modifier mes objectifs">
            <Icon name="Pen" size={20} color="text-tertiary" />
          </Pressable>
        ) : null}
      </View>
      <View className="flex-row flex-wrap gap-2">
        {(() => {
          const seen = new Set<string>();
          return objectives
            .filter((o) => {
              const norm = o.objective.trim().toLowerCase();
              if (seen.has(norm)) return false;
              seen.add(norm);
              return true;
            })
            .map((o) => (
              <Tag key={o.id} size="sm" tone="success">
                {o.objective}
              </Tag>
            ));
        })()}
      </View>
    </Card>
  );
}