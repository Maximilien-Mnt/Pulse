import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import type { BlockedUser } from "@/types";
import Toast from "react-native-toast-message";
import { t } from "@/hooks/useTranslation";

type BlockUserParams = {
  userId: string;
  onSuccess?: () => void;
  onError?: () => void;
};

async function checkIsFollowing(userId: string | null, targetId: string): Promise<boolean> {
  if (!userId) return false;
  const { data, error } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", userId)
    .eq("following_id", targetId)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

async function unfollowUser(followingId: string): Promise<void> {
  const userId = useAuthStore.getState().userId;
  if (!userId) return;
  await supabase
    .from("follows")
    .delete()
    .eq("follower_id", userId)
    .eq("following_id", followingId);
}

async function blockUserApi(params: { blockerId: string; blockedId: string }): Promise<BlockedUser> {
  const { data, error } = await supabase
    .from("blocked_users")
    .insert({
      blocker_id: params.blockerId,
      blocked_id: params.blockedId,
    })
    .select()
    .single();

  if (error) throw error;
  return data as BlockedUser;
}

async function fetchBlockedUserIds(userId: string): Promise<string[]> {
  // Never let a blocked_users failure break the calling query.
  try {
    const { data, error } = await supabase
      .from("blocked_users")
      .select("blocked_id")
      .eq("blocker_id", userId);

    if (error) return [];
    return (data ?? []).map((row) => row.blocked_id);
  } catch {
    return [];
  }
}


export function useBlockUser() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.userId);

  return useMutation({
    mutationFn: ({ userId: targetId, onSuccess, onError }: BlockUserParams) =>
      blockUserApi({ blockerId: userId!, blockedId: targetId }).then(async (data) => {
        // Unfollow if following
        const following = await checkIsFollowing(userId, targetId);
        if (following) {
          await unfollowUser(targetId);
        }

        // Invalidate queries
        queryClient.invalidateQueries({ queryKey: ["feed"] });
        queryClient.invalidateQueries({ queryKey: ["user-posts", targetId] });
        queryClient.invalidateQueries({ queryKey: ["user-clubs", targetId] });
        queryClient.invalidateQueries({ queryKey: ["user-events", targetId] });
        // Recomputes counts from `follows` (covers the implicit unfollow above).
        queryClient.invalidateQueries({ queryKey: ["public-profile", targetId] });
        queryClient.invalidateQueries({ queryKey: ["public-profile", userId] });
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
        queryClient.invalidateQueries({ queryKey: ["blocked-users", userId] });

        Toast.show({
          type: "success",
          text1: t("profile.block.done"),
        });

        onSuccess?.();
        return data;
      }),
    onError: (err: any) => {
      Toast.show({
        type: "error",
        text1: err?.message ?? "Impossible de bloquer l'utilisateur",
      });
      // onError callback will be called by the component
    },
  });
}

export function useBlockedUserIds() {
  const userId = useAuthStore((s) => s.userId);

  return useQuery({
    queryKey: ["blocked-users", userId],
    queryFn: () => fetchBlockedUserIds(userId!),
    enabled: !!userId,
  });
}


