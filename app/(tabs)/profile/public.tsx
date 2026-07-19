import { PublicProfileGallery } from "@/components/profile/PublicProfileGallery";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { usePublicProfile, parsePublicStatus } from "@/hooks/usePublicProfile";
import { useUserPublicContent } from "@/hooks/useUserPublicContent";
import { SPORTS } from "@/lib/constants";
import { useAuthStore } from "@/stores/authStore";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function MyPublicProfileScreen() {
  const router = useRouter();
  const userId = useAuthStore((s) => s.userId);
  const { data: profile, isLoading, isError, error, refetch } = usePublicProfile(userId);
  const { postsQuery, clubsQuery, eventsQuery } = useUserPublicContent(userId);

  if (isError) {
    return (
      <SafeAreaView className="flex-1">
        <ErrorState message={error?.message ?? "Erreur"} onRetry={() => void refetch()} />
      </SafeAreaView>
    );
  }

  if (isLoading || !profile) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-neutral-50 dark:bg-[#0A0F1E]">
        <Text>Chargement…</Text>
      </SafeAreaView>
    );
  }

  const statusMap = parsePublicStatus(profile.public_status);
  const stats = profile.stats;

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-[#0A0F1E]" edges={["top"]}>
      <View className="flex-row items-center justify-between px-4 pt-2">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color="#1E6BFF" />
        </Pressable>
        <Text className="text-lg font-bold text-neutral-900 dark:text-neutral-50">Mon profil public</Text>
        <Button title="Modifier" variant="ghost" onPress={() => router.push("/profile/edit-public")} />
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

        {profile.public_photos?.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-4">
            {profile.public_photos.map((uri) => (
              <Image
                key={uri}
                source={{ uri }}
                style={{ width: 120, height: 120, borderRadius: 16, marginRight: 8 }}
                contentFit="cover"
              />
            ))}
          </ScrollView>
        ) : null}

        <View className="flex-row justify-around mt-6">
          {[
            { label: "Abonnés", value: stats?.followers_count ?? 0 },
            { label: "Posts", value: stats?.posts_count ?? 0 },
            { label: "Clubs", value: stats?.clubs_created_count ?? 0 },
            { label: "Events", value: stats?.events_created_count ?? 0 },
          ].map((s) => (
            <View key={s.label} className="items-center">
              <Text className="text-xl font-bold text-neutral-900 dark:text-neutral-50">{s.value}</Text>
              <Text className="text-xs text-neutral-500">{s.label}</Text>
            </View>
          ))}
        </View>

        <Card className="mt-4 p-4">
          <Text className="text-lg font-semibold mb-2">Sports & statuts</Text>
          {profile.sports.map((s) => (
            <View key={s.id} className="flex-row justify-between items-center mb-2">
              <Text className="text-neutral-800 dark:text-neutral-100">
                {SPORTS.find((x) => x.id === s.sport_id)?.label ?? s.sport_id} — {s.level}
              </Text>
              <Badge>{statusMap[s.sport_id] ?? "—"}</Badge>
            </View>
          ))}
        </Card>

        <PublicProfileGallery
          posts={postsQuery.data ?? []}
          clubs={clubsQuery.data ?? []}
          events={eventsQuery.data ?? []}
          loading={postsQuery.isLoading || clubsQuery.isLoading || eventsQuery.isLoading}
        />
      </ScrollView>
    </SafeAreaView>
  );
}