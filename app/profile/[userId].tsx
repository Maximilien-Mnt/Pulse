import { PublicProfileGallery } from "@/components/profile/PublicProfileGallery";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useContactUser } from "@/hooks/useContactUser";
import { useFollow, useIsFollowing } from "@/hooks/useFollow";
import { usePublicProfile, parsePublicStatus } from "@/hooks/usePublicProfile";
import { useUserPublicContent } from "@/hooks/useUserPublicContent";
import { SPORTS } from "@/lib/constants";
import { useAuthStore } from "@/stores/authStore";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

export default function UserPublicProfileScreen() {
  const { userId: targetUserId } = useLocalSearchParams<{ userId: string }>();
  const router = useRouter();
  const myId = useAuthStore((s) => s.userId);
  const isOwn = myId === targetUserId;

  const { data: profile, isLoading, isError, error, refetch } = usePublicProfile(targetUserId);
  const { data: isFollowing } = useIsFollowing(isOwn ? null : targetUserId);
  const { followMut, unfollowMut } = useFollow(targetUserId);
  const contactMut = useContactUser();
  const { postsQuery, clubsQuery, eventsQuery } = useUserPublicContent(targetUserId);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-neutral-50 dark:bg-[#0A0F1E]">
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  if (isError || !profile) {
    return (
      <SafeAreaView className="flex-1">
        <ErrorState message={error?.message ?? "Profil introuvable"} onRetry={() => void refetch()} />
      </SafeAreaView>
    );
  }

  if (!profile.is_public_profile && !isOwn) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-neutral-50 dark:bg-[#0A0F1E] px-6">
        <Text className="text-center text-neutral-900 dark:text-neutral-50 mb-4">
          Ce profil n'est pas public.
        </Text>
        <Button title="Retour" variant="secondary" onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

  const statusMap = parsePublicStatus(profile.public_status);
  const stats = profile.stats;
  const engagementRate =
    stats && stats.posts_count > 0
      ? Math.round(((stats.total_likes_received + stats.total_comments_received) / stats.posts_count) * 10) / 10
      : 0;

  const handleFollow = () => {
    if (isFollowing) unfollowMut.mutate();
    else followMut.mutate();
  };

  const handleContact = () => {
    contactMut.mutate(targetUserId!, {
      onSuccess: (cid) => router.push(`/(tabs)/conversations/${cid}`),
      onError: () => Toast.show({ type: "error", text1: "Impossible de contacter" }),
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-[#0A0F1E]" edges={["top"]}>
      <View className="flex-row items-center px-4 pt-2">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color="#1E6BFF" />
        </Pressable>
        <Text className="text-lg font-bold ml-3 text-neutral-900 dark:text-neutral-50">Profil</Text>
      </View>

      <ScrollView contentContainerClassName="px-4 pb-24 pt-4">
        <View className="items-center">
          <Avatar uri={profile.avatar_url} size={80} className="border-2 border-primary" />
          <Text className="text-2xl font-bold mt-3 text-neutral-900 dark:text-neutral-50">{profile.full_name}</Text>
          <Text className="text-neutral-500">@{profile.username}</Text>
          {profile.bio ? (
            <Text className="text-center text-neutral-700 dark:text-neutral-200 mt-2">{profile.bio}</Text>
          ) : null}
          <Text className="text-sm text-neutral-500 mt-1">
            {[profile.city, profile.country].filter(Boolean).join(", ") || "—"}
          </Text>
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

        {!isOwn && (
          <View className="flex-row gap-3 mt-4">
            <Button
              title={isFollowing ? "Ne plus suivre" : "Suivre"}
              variant={isFollowing ? "secondary" : "primary"}
              className="flex-1"
              onPress={handleFollow}
              loading={followMut.isPending || unfollowMut.isPending}
            />
            <Button
              title="Contacter"
              variant="secondary"
              className="flex-1"
              onPress={handleContact}
              loading={contactMut.isPending}
            />
          </View>
        )}

        <View className="flex-row flex-wrap justify-around mt-6 gap-y-3">
          {[
            { label: "Abonnés", value: stats?.followers_count ?? 0 },
            { label: "Posts", value: stats?.posts_count ?? 0 },
            { label: "Clubs", value: stats?.clubs_created_count ?? 0 },
            { label: "Events", value: stats?.events_created_count ?? 0 },
            { label: "Likes", value: stats?.total_likes_received ?? 0 },
            { label: "Commentaires", value: stats?.total_comments_received ?? 0 },
          ].map((s) => (
            <View key={s.label} className="items-center w-1/3">
              <Text className="text-lg font-bold text-neutral-900 dark:text-neutral-50">{s.value}</Text>
              <Text className="text-xs text-neutral-500">{s.label}</Text>
            </View>
          ))}
        </View>

        {stats && (
          <Card className="mt-4 p-4">
            <Text className="text-sm text-neutral-600 dark:text-neutral-300">
              Engagement moyen : {engagementRate} interactions/post
            </Text>
            <Text className="text-sm text-neutral-500 mt-1">
              Abonnements historiques : {stats.historical_follows_count} · Désabonnements : {stats.unfollows_count}
            </Text>
          </Card>
        )}

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