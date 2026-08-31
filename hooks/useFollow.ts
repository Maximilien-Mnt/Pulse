import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/queryClient";
import { useAuthStore } from "@/stores/authStore";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation , t } from "@/hooks/useTranslation";
import type { PublicProfileData } from "@/hooks/usePublicProfile";

export function useIsFollowing(targetUserId: string | null | undefined) {
  const userId = useAuthStore((s) => s.userId);
  return useQuery({
    queryKey: ["is-following", userId, targetUserId],
    enabled: !!userId && !!targetUserId && userId !== targetUserId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("follower_id", userId!)
        .eq("following_id", targetUserId!)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
  });
}

export function useFollow(targetUserId: string | null | undefined) {
  const userId = useAuthStore((s) => s.userId);
  const qc = useQueryClient();
  const { t } = useTranslation();

  /**
   * Optimistically bump the subscribers (followers) count of the target
   * profile and the "abonnements" (following) count of the current user's
   * own profile, so the UI updates instantly on follow/unfollow. The values
   * are then confirmed (or corrected) by the refetch triggered in onSuccess,
   * and every fresh fetch recomputes the count from the `follows` table.
   */
  function optimisticBump(direction: 1 | -1) {
    if (!targetUserId) return;
    const bumpStats = (key: readonly unknown[], field: "followers_count" | "following_count") => {
      qc.setQueryData<PublicProfileData | null>(key, (prev) => {
        if (!prev?.stats) return prev;
        return {
          ...prev,
          stats: {
            ...prev.stats,
            [field]: Math.max(0, prev.stats[field] + direction),
          },
        };
      });
    };
    // Target profile: subscribers count (+1 / -1).
    bumpStats(["public-profile", targetUserId], "followers_count");
    // Current user's own profile: subscriptions count (+1 / -1).
    if (userId && userId !== targetUserId) {
      bumpStats(["public-profile", userId], "following_count");
    }
  }

  const followMut = useMutation({
    mutationFn: async () => {
      if (!userId || !targetUserId) throw new Error("auth");
      // Idempotency guard: if the follow row already exists (e.g. double-tap),
      // skip both the insert and the notification.
      const { data: existing } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("follower_id", userId)
        .eq("following_id", targetUserId)
        .maybeSingle();
      if (existing) return;
      const { error } = await supabase.from("follows").insert({
        follower_id: userId,
        following_id: targetUserId,
      });
      if (error) throw error;
      await supabase.from("notifications").insert({
        user_id: targetUserId,
        type: "new_follower",
        title: t("follow.newFollower"),
        body: t("follow.newFollowerBody"),
        data: { follower_id: userId },
      });
    },
    onMutate: () => {
      optimisticBump(1);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["is-following", userId, targetUserId] });
      // Target profile (subscribers count) and own profile (subscriptions
      // count): refetch recomputes the counts from `follows` — source of truth.
      void qc.invalidateQueries({ queryKey: ["public-profile", targetUserId] });
      if (userId) void qc.invalidateQueries({ queryKey: ["public-profile", userId] });
      // Refresh the feed so the "Abonnements" filter reflects the new follow.
      void qc.invalidateQueries({ queryKey: ["feed"] });
    },
    onError: () => {
      // Roll back the optimistic bump by refetching the real values.
      void qc.invalidateQueries({ queryKey: ["public-profile", targetUserId] });
      if (userId) void qc.invalidateQueries({ queryKey: ["public-profile", userId] });
    },
  });

  const unfollowMut = useMutation({
    mutationFn: async () => {
      if (!userId || !targetUserId) throw new Error("auth");
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", userId)
        .eq("following_id", targetUserId);
      if (error) throw error;
    },
    onMutate: () => {
      optimisticBump(-1);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["is-following", userId, targetUserId] });
      void qc.invalidateQueries({ queryKey: ["public-profile", targetUserId] });
      if (userId) void qc.invalidateQueries({ queryKey: ["public-profile", userId] });
      // Refresh the feed so the "Abonnements" filter reflects the removed follow.
      void qc.invalidateQueries({ queryKey: ["feed"] });
    },
    onError: () => {
      void qc.invalidateQueries({ queryKey: ["public-profile", targetUserId] });
      if (userId) void qc.invalidateQueries({ queryKey: ["public-profile", userId] });
    },
  });

  return { followMut, unfollowMut };
}
