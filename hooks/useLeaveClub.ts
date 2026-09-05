import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import Toast from "react-native-toast-message";
import { usePostHog } from "posthog-react-native";
import { t } from "@/hooks/useTranslation";

export function useLeaveClub() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.userId);
  const posthog = usePostHog();

  return useMutation({
    mutationFn: async ({
      clubId,
      clubName,
      creatorId,
      reason,
    }: {
      clubId: string;
      clubName: string;
      creatorId: string;
      reason?: string;
    }) => {
      if (!userId) throw new Error("auth");

      // Remove the member from the club
      const { error: deleteError } = await supabase
        .from("club_members")
        .delete()
        .eq("club_id", clubId)
        .eq("user_id", userId);

      if (deleteError) throw deleteError;

      // Notify the club creator with the optional reason
      const reasonText = reason?.trim()
        ? `\n\nRaison : ${reason.trim()}`
        : "";

      await supabase.rpc("notify_user", {
        p_user_id: creatorId,
        p_type: "club_member_left",
        p_title: t("notifications.clubMemberLeft.title"),
        p_body: t("notifications.clubMemberLeft.body", {
          name: "Un membre",
          clubName,
          reason: reasonText,
        }),
        p_data: {
          club_id: clubId,
          club_name: clubName,
          left_by: userId,
          reason: reason?.trim() || null,
        },
      });

      return { ok: true };
    },
    onSuccess: () => {
      posthog.capture("club_left", {});
      Toast.show({ type: "success", text1: t("clubs.leftSuccess") });
      void qc.invalidateQueries({ queryKey: ["club"] });
      void qc.invalidateQueries({ queryKey: ["join-request-status"] });
      void qc.invalidateQueries({ queryKey: ["club-members"] });
      void qc.invalidateQueries({ queryKey: ["club-all-members"] });
      void qc.invalidateQueries({ queryKey: ["my-club-memberships"] });
      void qc.invalidateQueries({ queryKey: ["notifications"] });
      void qc.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    },
    onError: () => {
      Toast.show({
        type: "error",
        text1: t("common.error"),
      });
    },
  });
}
