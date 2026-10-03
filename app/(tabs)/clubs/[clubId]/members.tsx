import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  FlatList,
  Pressable,
  View,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeScreen } from "@/components/shared/SafeScreen";
import { BackButton } from "@/components/ui/BackButton";
import { Text } from "@/components/ui/Text";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { PressableScale } from "@/components/ui/PressableScale";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { RemoveMemberSheet } from "@/components/shared/RemoveMemberSheet";
import { MemberStatusBadge } from "@/components/clubs/MemberStatusBadge";
import { MemberStatusEditor } from "@/components/clubs/MemberStatusEditor";
import { useClubAllMembers, type ClubMember } from "@/hooks/useClubAllMembers";
import { useRemoveClubMember } from "@/hooks/useRemoveClubMember";
import { useUpdateClubMemberStatus } from "@/hooks/useUpdateClubMemberStatus";
import { getMemberStatusLabel, isManagementStatus } from "@/lib/clubMemberStatus";
import { useStartConversationWith } from "@/hooks/useStartConversationWith";
import { useAuthStore } from "@/stores/authStore";
import { supabase } from "@/lib/supabase";
import type { Club } from "@/types";
import { useTranslation } from "@/hooks/useTranslation";

export default function ClubMembersScreen() {
  const { clubId } = useLocalSearchParams<{ clubId: string }>();
  const { t } = useTranslation();
  const userId = useAuthStore((s) => s.userId);
  const router = useRouter();

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
  const updateStatus = useUpdateClubMemberStatus();
  const { startConversation, isPending: isContacting } = useStartConversationWith();

  const [removeTarget, setRemoveTarget] = useState<ClubMember | null>(null);
  const [contactingId, setContactingId] = useState<string | null>(null);
  const [editingStatusId, setEditingStatusId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Mirrors `user_can_manage_club_members()` in migration 058: the club
  // creator, a technical owner/admin, or a member holding a "Direction /
  // gestion" status. The RPC is the authority — this only gates the UI.
  const selfMember = members.find((m) => m.user_id === userId) ?? null;
  const canManageStatus =
    !!userId &&
    (isAdmin ||
      (selfMember?.raw_role === "owner" || selfMember?.raw_role === "admin") ||
      isManagementStatus(selfMember?.member_status));

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
            const isEditing = editingStatusId === item.user_id;
            const statusLabel = getMemberStatusLabel(
              item.member_status,
              item.custom_member_status,
              t
            );
            // Never let a manager edit their own row (anti self-escalation) —
            // the RPC rejects it too with `CANNOT_EDIT_SELF`.
            const canEditThisStatus = canManageStatus && !isSelf;

            return (
              <View>
              <PressableScale
                onPress={() => router.push(`/profile/${item.user_id}`)}
                scaleOnPress={0.97}
                accessibilityRole="button"
                accessibilityLabel={`Voir le profil de ${item.full_name}`}
                className="flex-row items-center gap-3 px-4 py-3 mx-0.5 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700">
                <Avatar uri={item.avatar_url} size={48} />

                <View className="flex-1 min-w-0 items-start gap-1">
                  <Text variant="body" className="font-medium text-neutral-900 dark:text-neutral-50" numberOfLines={1}>
                    {item.full_name}
                  </Text>

                  <View className="flex-row items-center gap-1.5 flex-wrap">
                    {/* Status badge — tap to edit (managers only, never self) */}
                    {canEditThisStatus ? (
                      <Pressable
                        onPress={() => setEditingStatusId(isEditing ? null : item.user_id)}
                        disabled={updateStatus.isPending}
                        hitSlop={6}
                        accessibilityRole="button"
                        accessibilityState={{ selected: isEditing, disabled: updateStatus.isPending }}
                        accessibilityLabel={`${t("members.status.editAction")} — ${item.full_name}`}
                        testID={`member-status-${item.user_id}`}
                        className="flex-row items-center gap-1"
                      >
                        <MemberStatusBadge
                          memberStatus={item.member_status}
                          customMemberStatus={item.custom_member_status}
                          label={statusLabel}
                        />
                        <Icon name="Pen" size={12} color="#64748B" />
                      </Pressable>
                    ) : (
                      <MemberStatusBadge
                        memberStatus={item.member_status}
                        customMemberStatus={item.custom_member_status}
                        label={statusLabel}
                      />
                    )}

                    {/* Technical admin flag (kept separate from the status) */}
                    {item.is_admin ? (
                      <View className="px-2 py-0.5 rounded-full bg-primary/10">
                        <Text variant="caption" className="font-semibold text-primary">
                          {t("members.admin")}
                        </Text>
                      </View>
                    ) : null}
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
              </PressableScale>

              {/* Inline status editor — expanded under the tapped row */}
              {isEditing ? (
                <MemberStatusEditor
                  currentStatus={item.member_status}
                  currentCustomStatus={item.custom_member_status}
                  isPending={updateStatus.isPending}
                  onClose={() => setEditingStatusId(null)}
                  onSave={(memberStatus, customMemberStatus) => {
                    updateStatus.mutate(
                      {
                        clubId: clubId!,
                        memberId: item.user_id,
                        memberStatus,
                        customMemberStatus,
                      },
                      { onSuccess: () => setEditingStatusId(null) }
                    );
                  }}
                />
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