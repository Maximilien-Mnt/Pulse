import { supabase } from "@/lib/supabase";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import type { Club } from "@/types";
import { t } from "@/hooks/useTranslation";

/**
 * Deletes a club and notifies all members.
 * - Deletes the club (FK cascade removes club_members)
 * - Sends notification to all members
 */
export function useDeleteClub() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.userId);

  return useMutation({
    mutationFn: async ([clubId, clubName]: [string, string]) => {
      if (!userId) throw new Error("Not authenticated");

      // First, get all member IDs before deletion
      const { data: members, error: membersError } = await supabase
        .from("club_members")
        .select("user_id")
        .eq("club_id", clubId);

      if (membersError) throw membersError;

      const memberIds = (members ?? []).map((m) => m.user_id);

      // Delete the club (FK cascade will delete club_members automatically)
      const { error: deleteError } = await supabase
        .from("clubs")
        .delete()
        .eq("id", clubId)
        .eq("created_by", userId); // Ensure only creator can delete

      if (deleteError) throw deleteError;

      // Notify all members (except the creator who deleted it)
      const notificationPromises = memberIds
        .filter((id) => id !== userId)
        .map((memberId) =>
          supabase.rpc("notify_user", {
            p_user_id: memberId,
            p_type: "club_deleted",
            p_title: t("deleteClub.success"),
            p_body: t("deleteClub.body", { clubName }),
            p_data: { club_id: clubId, club_name: clubName },
          })
        );

      await Promise.all(notificationPromises);

      return { ok: true };
    },
    onMutate: async ([clubId]) => {
      // Cancel any outgoing refetches
      await qc.cancelQueries({ queryKey: ["my-created-clubs", userId] });
      await qc.cancelQueries({ queryKey: ["clubs"] });
      
      // Optimistically remove the club from the cache
      const previousCreatedClubs = qc.getQueryData<Club[]>(["my-created-clubs", userId]);
      qc.setQueryData(["my-created-clubs", userId], (old: Club[] | undefined) =>
        old ? old.filter((c) => c.id !== clubId) : old
      );
      
      // Also remove from general clubs cache
      const previousClubs = qc.getQueryData<Club[]>(["clubs"]);
      qc.setQueryData(["clubs"], (old: Club[] | undefined) =>
        old ? old.filter((c) => c.id !== clubId) : old
      );

      return { previousCreatedClubs, previousClubs };
    },
    onError: (_err, _clubId, ctx) => {
      if (ctx?.previousCreatedClubs) {
        qc.setQueryData(["my-created-clubs", userId], ctx.previousCreatedClubs);
      }
      if (ctx?.previousClubs) {
        qc.setQueryData(["clubs"], ctx.previousClubs);
      }
    },
    onSettled: () => {
      // Always refetch after error or success to ensure consistency
      void qc.invalidateQueries({ queryKey: ["my-created-clubs", userId] });
      void qc.invalidateQueries({ queryKey: ["my-club-memberships", userId] });
      void qc.invalidateQueries({ queryKey: ["clubs"] });
      void qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
