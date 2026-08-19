import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import Toast from "react-native-toast-message";
import { usePostHog } from "posthog-react-native";

export function useRemoveClubMember() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.userId);
  const posthog = usePostHog();

  return useMutation({
    mutationFn: async ({ clubId, memberId }: { clubId: string; memberId: string }) => {
      if (!userId) throw new Error("auth");
      
      // Verify the current user is the club creator
      const { data: club, error: clubError } = await supabase
        .from("clubs")
        .select("created_by, name")
        .eq("id", clubId)
        .single();

      if (clubError) throw clubError;
      if (club.created_by !== userId) throw new Error("unauthorized");

      // Remove the member
      const { error: deleteError } = await supabase
        .from("club_members")
        .delete()
        .eq("club_id", clubId)
        .eq("user_id", memberId);

      if (deleteError) throw deleteError;

      // Send notification to the removed member
      const { error: notifError } = await supabase.from("notifications").insert({
        user_id: memberId,
        type: "club_member_removed",
        title: "Retiré d'un club",
        body: `Tu as été retiré(e) du club "${club.name}" par le gestionnaire.`,
        data: { club_id: clubId, club_name: club.name } as any,
        read_at: null,
      });

      if (notifError) throw notifError;

      return { ok: true };
    },
    onSuccess: () => {
      posthog.capture("club_member_removed", {});
      Toast.show({ type: "success", text1: "Membre retiré du club" });
      void qc.invalidateQueries({ queryKey: ["club-members"] });
      void qc.invalidateQueries({ queryKey: ["notifications"] });
      void qc.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    },
    onError: (error: any) => {
      Toast.show({
        type: "error",
        text1: error.message === "unauthorized" ? "Non autorisé" : "Impossible de retirer le membre",
      });
    },
  });
}