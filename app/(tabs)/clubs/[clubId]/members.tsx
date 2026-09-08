import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  FlatList,
  Pressable,
  View,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { SafeScreen } from "@/components/shared/SafeScreen";
import { BackButton } from "@/components/ui/BackButton";
import { Text } from "@/components/ui/Text";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { RemoveMemberSheet } from "@/components/shared/RemoveMemberSheet";
import { useClubAllMembers, type ClubMember } from "@/hooks/useClubAllMembers";
import { useRemoveClubMember } from "@/hooks/useRemoveClubMember";
import { useStartConversationWith } from "@/hooks/useStartConversationWith";
import { useAuthStore } from "@/stores/authStore";
import { supabase } from "@/lib/supabase";
import type { Club } from "@/types";
import { useTranslation } from "@/hooks/useTranslation";

export default function ClubMembersScreen() {
  const { clubId } = useLocalSearchParams<{ clubId: string }>();
  const { t } = useTranslation();
  const userId = useAuthStore((s) => s.userId);

  const { data: club, isLoading: clubLoading } = useQuery({
    queryKey: ["club", clubId],
    enabled: !!clubId,
    queryFn: async () => {
      if (!clubId) return null;
      const { data, error } = await supabase
        .from("clubs")
        .select("name, created_by")
        .eq("id", clubId)
        .maybeSingle();
      if (error) throw error;
      return data as Pick<Club, "name" | "created_by"> | null;
    },
  });

  const { data: members = [], isLoading, refetch } = useClubAllMembers(clubId ?? null);

  const isAdmin = !!userId && !!club?.created_by && userId === club.created_by;
  const removeMember = useRemoveClubMember();
  const { startConversation, isPending: isContacting } = useStartConversationWith();

  const [removeTarget, setRemoveTarget] = useState<ClubMember | null>(null);
  const [contactingId, setContactingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const handleContact = (member: ClubMember) => {
    if (member.user_id === userId) return;
    setContactingId(member.user_id);
    startConversation(member.user_id).finally(() => setContactingId(null));
  };

  if (clubLoading) {
    return (
      <SafeScreen className="flex-1 bg-neutral-50 dark:bg-[#0A0F1C]" edges={["top"]}>
        <View className="h-16 mb-4" />
        <Skeleton className="w-full h-16 rounded-2xl" />
        <Skeleton className="mb-3 w-full h-14 rounded-xl" />
        <Skeleton className="mb-3 w-full h-14 rounded-xl" />
        <Skeleton className="mb-3 w-full h-14 rounded-xl" />
      </SafeScreen>
    );
  }

  const clubName = club?.name ?? t("clubJoin.defaultName");

  return (
    <SafeScreen className="flex-1 bg-neutral-50 dark:bg-[#0A0F1C]" edges={["top"]}>
      {/* Header — canonical back button + centered title */}
      <View className="flex-row items-center gap-3 px-4 py-3 border-b border-neutral-100 dark:border-neutral-800">
        <BackButton useInAppSession fallbackRoute={`/(tabs)/clubs/${clubId}/dashboard`} />
        <Text variant="h2" className="flex-1 text-center" numberOfLines={1}>
          {t("members.title")}
        </Text>
        <View className="w-11 h-11" />
      </View>
{isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#1E6BFF" />
        </View>
      ) : members.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <EmptyState icon="Users" title={t("members.empty")} />
        </View>
      ) : (
        <FlatList
          data={members}
          keyExtractor={(m) => m.user_id}
          contentContainerClassName="py-2"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          renderItem={({ item }) => {
            const isSelf = item.user_id === userId;
            const canDelete = isAdmin && !isSelf;
            const contactPending = contactingId === item.user_id;

            return (
              <View className="flex-row items-center gap-3 px-4 py-3 mx-0.5 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700">
                <Avatar uri={item.avatar_url} size={48} />

                <View className="flex-1 min-w-0 items-start">
                  <Text variant="body" className="font-medium text-neutral-900 dark:text-neutral-50" numberOfLines={1}>
                    {item.full_name}
                  </Text>
                  <View
                    className={
                      "px-2 py-0.5 rounded-full " +
                      (item.is_admin
                        ? "bg-primary/10"
                        : "bg-neutral-100 dark:bg-neutral-700")
                    }
                  >
                    <Text
                      variant="caption"
                      className={
                        "font-semibold " +
                        (item.is_admin
                          ? "text-primary"
                          : "text-neutral-600 dark:text-neutral-300")
                      }
                    >
                      {item.is_admin ? t("members.admin") : t("members.member")}
                    </Text>
                  </View>
                </View>

                {/* Contact */}
                <Pressable
                  onPress={() => handleContact(item)}
                  disabled={isSelf || isContacting}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`${t("common.contact")} ${item.full_name}`}
                  className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center active:bg-primary/20"
                >
                  {contactPending ? (
                    <ActivityIndicator size="small" color="#1E6BFF" />
                  ) : (
                    <Icon name={isSelf ? "User" : "MessageCircle"} size={20} color="primary" />
                  )}
                </Pressable>

                {/* Delete (admin only, never self) */}
                {canDelete ? (
                  <Pressable
                    onPress={() => setRemoveTarget(item)}
                    disabled={removeMember.isPending}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={`${t("common.delete")} ${item.full_name}`}
                    className="w-10 h-10 rounded-full bg-error-100/60 dark:bg-error-900/30 items-center justify-center active:bg-error-100"
                  >
                    <Icon name="Trash2" size={20} color="error-500" />
                  </Pressable>
                ) : null}
              </View>
            );
          }}
        />
      )}

      <RemoveMemberSheet
        visible={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        memberName={removeTarget?.full_name ?? ""}
        clubName={clubName}
        isPending={removeMember.isPending}
        onConfirm={(message) => {
          const target = removeTarget;
          if (!target) return;
          setRemoveTarget(null);
          removeMember.mutate({ clubId: clubId!, memberId: target.user_id, message });
        }}
      />
    </SafeScreen>
  );
}