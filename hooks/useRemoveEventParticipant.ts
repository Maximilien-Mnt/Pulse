import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import Toast from "react-native-toast-message";
import { usePostHog } from "posthog-react-native";
import { t } from "@/hooks/useTranslation";

export function useRemoveEventParticipant() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.userId);
  const posthog = usePostHog();

  return useMutation({
    mutationFn: async ({ eventId, participantId }: { eventId: string; participantId: string }) => {
      if (!userId) throw new Error("auth");

      // Verify the current user is the event creator
      const { data: event, error: eventError } = await supabase
        .from("events")
        .select("created_by, name, places_total, places_left, accepted_count")
        .eq("id", eventId)
        .single();

      if (eventError) throw eventError;
      if (event.created_by !== userId) throw new Error("unauthorized");

      // Remove the participant via atomic RPC (trigger keeps accepted_count in sync)
      const { error: leaveError } = await supabase.rpc("event_leave_atomic", {
        p_event_id: eventId,
        p_user_id: participantId,
      });
      if (leaveError) throw leaveError;

      // Send notification to the removed participant
      const { error: notifError } = await supabase.from("notifications").insert({
        user_id: participantId,
        type: "event_participant_removed",
        title: t("notifications.eventParticipantRemoved.title"),
        body: t("notifications.eventParticipantRemoved.body", { eventName: event.name }),
        data: { event_id: eventId, event_name: event.name } as any,
        read_at: null,
      });

      if (notifError) throw notifError;

      return { ok: true };
    },
    onSuccess: () => {
      posthog.capture("event_participant_removed", {});
      Toast.show({ type: "success", text1: t("notifications.eventParticipantRemoved.toast") });
      void qc.invalidateQueries({ queryKey: ["event-participants"] });
      void qc.invalidateQueries({ queryKey: ["event", undefined] });
      void qc.invalidateQueries({ queryKey: ["notifications"] });
      void qc.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    },
    onError: (error: any) => {
      Toast.show({
        type: "error",
        text1: error.message === "unauthorized" ? t("updateEvent.unauthorized") : "Impossible de retirer le participant",
      });
    },
  });
}