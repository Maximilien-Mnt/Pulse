import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import Toast from "react-native-toast-message";
import { usePostHog } from "posthog-react-native";

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

      // Remove the participant
      const { error: deleteError } = await supabase
        .from("event_participants")
        .delete()
        .eq("event_id", eventId)
        .eq("user_id", participantId);

      if (deleteError) throw deleteError;

      // If event has limited places, increment places_left and decrement accepted_count
      if (event.places_total != null) {
        const newPlacesLeft = (event.places_left ?? 0) + 1;
        const newAcceptedCount = (event.accepted_count ?? 0) - 1;

        const { error: updateError } = await supabase
          .from("events")
          .update({
            places_left: newPlacesLeft,
            accepted_count: newAcceptedCount,
          })
          .eq("id", eventId);

        if (updateError) throw updateError;
      }

      // Send notification to the removed participant
      const { error: notifError } = await supabase.from("notifications").insert({
        user_id: participantId,
        type: "event_participant_removed",
        title: "Retiré d'un événement",
        body: `Tu as été retiré(e) de l'événement "${event.name}" par le gestionnaire.`,
        data: { event_id: eventId, event_name: event.name } as any,
        read_at: null,
      });

      if (notifError) throw notifError;

      return { ok: true };
    },
    onSuccess: () => {
      posthog.capture("event_participant_removed", {});
      Toast.show({ type: "success", text1: "Participant retiré de l'événement" });
      void qc.invalidateQueries({ queryKey: ["event-participants"] });
      void qc.invalidateQueries({ queryKey: ["event", undefined] });
      void qc.invalidateQueries({ queryKey: ["notifications"] });
      void qc.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    },
    onError: (error: any) => {
      Toast.show({
        type: "error",
        text1: error.message === "unauthorized" ? "Non autorisé" : "Impossible de retirer le participant",
      });
    },
  });
}