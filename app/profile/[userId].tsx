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
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Icon } from "@/components/ui/Icon";
import { useContactUser } from "@/hooks/useContactUser";
import { useFollow, useIsFollowing } from "@/hooks/useFollow";
import { usePublicProfile, parsePublicStatus } from "@/hooks/usePublicProfile";
import { useUserPublicContent } from "@/hooks/useUserPublicContent";
import { useBlockUser } from "@/hooks/useBlockUser";
import { getCountryDisplay } from "@/utils/countries";
import { useAuthStore } from "@/stores/authStore";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, View, Alert } from "react-native";
import { SafeScreen } from "@/components/shared/SafeScreen";
import { ReportSheet } from "@/components/shared/ReportSheet";
import { BackButton } from "@/components/ui/BackButton";
import Toast from "react-native-toast-message";

export default function UserPublicProfileScreen() {
  const { userId: targetUserId } = useLocalSearchParams<{ userId: string }>();
  const router = useRouter();
  const myId = useAuthStore((s) => s.userId);
  const isOwn = myId === targetUserId;
  const [reportSheetVisible, setReportSheetVisible] = useState(false);

  const { data: profile, isLoading, isError, error, refetch } = usePublicProfile(targetUserId);
  const { data: isFollowing } = useIsFollowing(isOwn ? null : targetUserId);
  const { followMut, unfollowMut } = useFollow(targetUserId);
  const contactMut = useContactUser();
  const blockMut = useBlockUser();
  const { postsQuery, clubsQuery, eventsQuery } = useUserPublicContent(targetUserId);

  if (isLoading) {
    return (
      <SafeScreen className="flex-1 items-center justify-center bg-neutral-50 dark:bg-[#0A0F1E]">
        <LoadingSpinner />
      </SafeScreen>
    );
  }

  if (isError || !profile) {
    return (
      <SafeScreen className="flex-1">
        <ErrorState message={error?.message ?? "Profil introuvable"} onRetry={() => void refetch()} />
      </SafeScreen>
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

  const handleBlock = () => {
    Alert.alert(
      "Bloquer cet utilisateur ?",
      "En bloquant cet utilisateur, il ne pourra plus te contacter ni démarrer de nouvelle conversation avec toi. Tu ne verras plus ses posts, clubs ou événements dans ton feed. Tu peux toujours le débloquer depuis tes paramètres.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Bloquer",
          style: "destructive",
          onPress: () => {
            blockMut.mutate(
              { userId: targetUserId! },
              {
                onSuccess: () => {
                  Toast.show({ type: "success", text1: "Utilisateur bloqué" });
                  router.back();
                },
              }
            );
          },
        },
      ]
    );
  };

  const isPublic = profile.is_public_profile;

  return (
    <SafeScreen className="flex-1 bg-neutral-50 dark:bg-[#0A0F1E]" edges={["top"]}>
      <View className="flex-row items-center justify-between px-4 pt-2">
        <View className="flex-row items-center gap-2">
          <BackButton />
          <Text className="text-lg font-bold text-neutral-900 dark:text-neutral-50">Profil</Text>
        </View>
        {!isOwn ? (
          <Pressable
            onPress={() => setReportSheetVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Signaler ce profil"
            hitSlop={8}
          >
            <Icon name="Flag" size={20} color="text-tertiary" />
          </Pressable>
        ) : null}
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
            {[profile.city, getCountryDisplay(profile.country)].filter(Boolean).join(", ") || "—"}
          </Text>
        </View>

        {!isOwn && (
          <View className="mt-4 gap-2.5">
            {isPublic && (
              <Button
                title={isFollowing ? "Se désabonner" : "S'abonner"}
                variant={isFollowing ? "secondary" : "primary"}
                icon="User"
                onPress={handleFollow}
                loading={followMut.isPending || unfollowMut.isPending}
                className="rounded-xl"
              />
            )}
            <Button
              title="Message"
              variant="secondary"
              icon="Mail"
              onPress={handleContact}
              loading={contactMut.isPending}
              className="rounded-xl"
            />
            <View className="items-center">
              <Button
                title="Bloquer"
                variant="ghost"
                onPress={handleBlock}
                loading={blockMut.isPending}
              />
            </View>
          </View>
        )}

        {isPublic && stats && <StatsGrid stats={stats} isPublic={isPublic} />}

        <SportStatusCard sports={profile.sports} statusMap={statusMap} />

        <InterestedSportsCard sports={profile.interested_sports ?? []} />

        <ObjectivesCard objectives={profile.objectives ?? []} />

        {isPublic && (
          <PublicProfileGallery
            posts={postsQuery.data ?? []}
            clubs={clubsQuery.data ?? []}
            events={eventsQuery.data ?? []}
            loading={postsQuery.isLoading || clubsQuery.isLoading || eventsQuery.isLoading}
          />
        )}
      </ScrollView>

      <ReportSheet
        visible={reportSheetVisible}
        onClose={() => setReportSheetVisible(false)}
        targetType="profile"
        targetId={targetUserId}
        targetAuthorId={targetUserId}
        targetLabel={profile.full_name}
      />
    </SafeScreen>
  );
}
