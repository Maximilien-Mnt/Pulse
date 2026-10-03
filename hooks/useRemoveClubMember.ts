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

      // The notification text is authored here (actor's language) and passed
      // to the RPC so the delete + notification happen in ONE transaction.
      const { data: club, error: clubError } = await supabase
        .from("clubs")
        .select("name")
        .eq("id", clubId)
        .single();

      if (clubError) throw clubError;

      const messageText = message?.trim()
        ? `\n\n${t("notifications.clubMemberRemoved.messageLabel")} ${message.trim()}`
        : "";

      const { error } = await supabase.rpc("remove_club_member_secure", {
        p_club_id: clubId,
        p_member_id: memberId,
        p_title: t("notifications.clubMemberRemoved.title"),
        p_body: `${t("notifications.clubMemberRemoved.body", { clubName: club.name })}${messageText}`,
      });

      if (error) throw error;

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