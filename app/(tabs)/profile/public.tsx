import { PublicProfileGallery } from "@/components/profile/PublicProfileGallery";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { Icon } from "@/components/ui/Icon";
import { Tag } from "@/components/ui/Tag";
import { usePublicProfile, parsePublicStatus } from "@/hooks/usePublicProfile";
import { useUserPublicContent } from "@/hooks/useUserPublicContent";
import { OBJECTIVES, SPORTS, WEEKDAYS } from "@/lib/constants";
import { useAuthStore } from "@/stores/authStore";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeScreen } from "@/components/shared/SafeScreen";
import { BackButton } from "@/components/ui/BackButton";

function formatHour(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

export default function MyPublicProfileScreen() {
  const router = useRouter();
  const userId = useAuthStore((s) => s.userId);
  const { data: profile, isLoading, isError, error, refetch } = usePublicProfile(userId);
  const { postsQuery, clubsQuery, eventsQuery } = useUserPublicContent(userId);

  if (isError) {
    return (
      <SafeScreen className="flex-1">
        <ErrorState message={error?.message ?? "Erreur"} onRetry={() => void refetch()} />
      </SafeScreen>
    );
  }

  if (isLoading || !profile) {
    return (
      <SafeScreen className="flex-1 items-center justify-center bg-neutral-50 dark:bg-[#0A0F1E]">
        <Text>Chargement…</Text>
      </SafeScreen>
    );
  }

  const statusMap = parsePublicStatus(profile.public_status);
  const stats = profile.stats;

  return (
    <SafeScreen className="flex-1 bg-neutral-50 dark:bg-[#0A0F1E]" edges={["top"]}>
      <View className="flex-row items-center justify-between px-4 pt-2">
        <BackButton />
        <Text className="text-lg font-bold text-neutral-900 dark:text-neutral-50">Mon profil public</Text>
        <Button title="Modifier" variant="ghost" onPress={() => router.push("/(tabs)/profile/edit-public")} />
      </View>

      <ScrollView contentContainerClassName="px-4 pb-24 pt-4">
        <View className="items-center">
          <Avatar uri={profile.avatar_url} size={80} className="border-2 border-primary" />
          <Text className="text-2xl font-bold mt-3 text-neutral-900 dark:text-neutral-50">{profile.full_name}</Text>
          <Text className="text-neutral-500">@{profile.username}</Text>
          {profile.bio ? (
            <Text className="text-center text-neutral-700 dark:text-neutral-200 mt-2">{profile.bio}</Text>
          ) : null}
        </View>

        {stats && (
          <View className="flex-row flex-wrap justify-between mt-6 gap-3">
            {[
              { label: "Abonnés", value: stats.followers_count ?? 0, icon: "Users" as const },
              { label: "Posts", value: stats.posts_count ?? 0, icon: "FileText" as const },
              { label: "Clubs", value: stats.clubs_created_count ?? 0, icon: "Calendar" as const },
              { label: "Events", value: stats.events_created_count ?? 0, icon: "Calendar" as const },
              { label: "Likes", value: stats.total_likes_received ?? 0, icon: "Heart" as const },
              { label: "Commentaires", value: stats.total_comments_received ?? 0, icon: "MessageSquare" as const },
            ].map((item) => (
              <View key={item.label} className="w-[31%] bg-neutral-50 dark:bg-neutral-800/60 rounded-xl border border-border dark:border-border-dark p-3 items-center">
                <Icon name={item.icon} size={20} color="primary" />
                <Text className="text-base font-bold text-neutral-900 dark:text-neutral-50 mt-1">{item.value}</Text>
                <Text className="text-[10px] text-neutral-500">{item.label}</Text>
              </View>
            ))}
          </View>
        )}

        {profile.sports.length > 0 && (
          <Card className="mt-5 p-4">
            <Text className="text-lg font-semibold mb-3">Sports & statuts</Text>
            <View className="gap-4">
              {profile.sports.map((s) => {
                const sportDef = SPORTS.find((x) => x.id === s.sport_id);
                const timeSlots = (s.time_slots as { weekday: number; startHour: number; endHour: number }[] | undefined) ?? [];
                return (
                  <View key={s.id} className="border-b border-border dark:border-border-dark last:border-b-0 pb-3 last:pb-0">
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
                      <Tag size="sm" tone="neutral">{s.practice}</Tag>
                    </View>

                    {timeSlots.length > 0 && (
                      <View className="flex-row flex-wrap gap-1.5 mt-2.5">
                        {timeSlots.map((slot, idx) => (
                          <View
                            key={idx}
                            className="px-2 py-1 rounded-md bg-neutral-100 dark:bg-neutral-700/70"
                          >
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
        )}

        {profile.interested_sports?.length > 0 && (
          <Card className="mt-4 p-4">
            <View className="flex-row items-center gap-2 mb-2">
              <Icon name="Heart" size={20} color="accent" />
              <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-50">Sports qui m’intéressent</Text>
            </View>
            <View className="flex-row flex-wrap gap-2">
              {profile.interested_sports
                .filter(Boolean)
                .map((sid) => {
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
        )}

        {profile.objectives?.length > 0 && (
          <Card className="mt-4 p-4">
            <View className="flex-row items-center gap-2 mb-2">
              <Icon name="CheckCircle2" size={20} color="success" />
              <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-50">Mes objectifs</Text>
            </View>
            <View className="flex-row flex-wrap gap-2">
              {(() => {
                const seen = new Set<string>();
                return profile.objectives
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
        )}

        <PublicProfileGallery
          posts={postsQuery.data ?? []}
          clubs={clubsQuery.data ?? []}
          events={eventsQuery.data ?? []}
          loading={postsQuery.isLoading || clubsQuery.isLoading || eventsQuery.isLoading}
        />
      </ScrollView>
    </SafeScreen>
  );
}