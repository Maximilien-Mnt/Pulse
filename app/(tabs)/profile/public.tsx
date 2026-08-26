import { PublicProfileGallery } from "@/components/profile/PublicProfileGallery";
import {
  StatsGrid,
  SportStatusCard,
  InterestedSportsCard,
  ObjectivesCard,
} from "@/components/profile/ProfileSections";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/ErrorState";
import { usePublicProfile, parsePublicStatus } from "@/hooks/usePublicProfile";
import { useUserPublicContent } from "@/hooks/useUserPublicContent";
import { useAuthStore } from "@/stores/authStore";
import { useRouter } from "expo-router";
import { ScrollView, Text, View } from "react-native";
import { SafeScreen } from "@/components/shared/SafeScreen";
import { BackButton } from "@/components/ui/BackButton";

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

        {stats && <StatsGrid stats={stats} isPublic={profile.is_public_profile} />}

        <SportStatusCard sports={profile.sports} statusMap={statusMap} />
        <InterestedSportsCard sports={profile.interested_sports ?? []} />
        <ObjectivesCard objectives={profile.objectives ?? []} />

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