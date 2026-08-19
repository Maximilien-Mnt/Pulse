import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/queryClient";
import { useAuthStore } from "@/stores/authStore";
import { useMutation, useQuery } from "@tanstack/react-query";

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

  const followMut = useMutation({
    mutationFn: async () => {
      if (!userId || !targetUserId) throw new Error("auth");
      const { error } = await supabase.from("follows").insert({
        follower_id: userId,
        following_id: targetUserId,
      });
      if (error) throw error;
      await supabase.from("notifications").insert({
        user_id: targetUserId,
        type: "new_follower",
        title: "Nouvel abonné",
        body: "Quelqu'un a commencé à te suivre.",
        data: { follower_id: userId },
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["is-following", userId, targetUserId] });
      void queryClient.invalidateQueries({ queryKey: ["public-profile", targetUserId] });
      // Refresh the feed so the "Abonnements" filter reflects the new follow.
      void queryClient.invalidateQueries({ queryKey: ["feed"] });
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
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["is-following", userId, targetUserId] });
      void queryClient.invalidateQueries({ queryKey: ["public-profile", targetUserId] });
      // Refresh the feed so the "Abonnements" filter reflects the removed follow.
      void queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });

  return { followMut, unfollowMut };
}
