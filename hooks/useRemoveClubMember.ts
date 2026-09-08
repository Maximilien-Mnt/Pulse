import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import Toast from "react-native-toast-message";
import { usePostHog } from "posthog-react-native";
import { t } from "@/hooks/useTranslation";

export function useRemoveClubMember() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.userId);
  const posthog = usePostHog();

  return useMutation({
    mutationFn: async ({
      clubId,
      memberId,
      message,
    }: {
      clubId: string;
      memberId: string;
      /** Optional explanation appended to the removed member's notification. */
      message?: string;
    }) => {
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

      // Optional message appended to the notification body.
      const messageText = message?.trim()
        ? `\n\n${t("notifications.clubMemberRemoved.messageLabel")} ${message.trim()}`
        : "";

      // Send notification to the removed member (RLS lets the admin insert a
      // notification for the removed user through the notify_user RPC path).
      const { error: notifError } = await supabase.rpc("notify_user", {
        p_user_id: memberId,
        p_type: "club_member_removed",
        p_title: t("notifications.clubMemberRemoved.title"),
        p_body: `${t("notifications.clubMemberRemoved.body", { clubName: club.name })}${messageText}`,
        p_data: {
          club_id: clubId,
          club_name: club.name,
          message: message?.trim() || null,
        },
      });

      if (notifError) throw notifError;

      return { ok: true };
    },
    onSuccess: () => {
      posthog.capture("club_member_removed", {});
      Toast.show({ type: "success", text1: t("actions.removeMember.success") });
      void qc.invalidateQueries({ queryKey: ["club-members"] });
      void qc.invalidateQueries({ queryKey: ["club-all-members"] });
      void qc.invalidateQueries({ queryKey: ["club"] });
      void qc.invalidateQueries({ queryKey: ["notifications"] });
      void qc.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    },
    onError: (error: any) => {
      Toast.show({
        type: "error",
        text1: error.message === "unauthorized" ? t("updateClub.unauthorized") : "Impossible de retirer le membre",
      });
    },
  });
}