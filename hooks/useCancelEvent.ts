import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { assertCanManageEvent } from "@/lib/eventPermissions";
import { useAuthStore } from "@/stores/authStore";
import Toast from "react-native-toast-message";
import { t } from "@/hooks/useTranslation";

/**
 * Cancels an event and notifies all participants + club members.
 * - Resolves permissions (creator OR owner/admin of the publishing club)
 * - Fetches event_participants and club_members
 * - Deletes the event (FK cascades: participants, favorites, join requests)
 * - Sends a notification to every affected user with an optional message
 */
export function useCancelEvent() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.userId);

  return useMutation({
    mutationFn: async ({
      eventId,
      eventName,
      clubId,
      message,
    }: {
      eventId: string;
      eventName: string;
      clubId?: string | null;
      message?: string;
    }) => {
      if (!userId) throw new Error("auth");

      // Verify the current user manages the event (creator or publishing-club owner/admin)
      const managedEvent = await assertCanManageEvent(eventId, userId);
      const effectiveClubId = clubId ?? managedEvent.publisher_club_id ?? managedEvent.club_id ?? null;

      // Collect all affected users: event participants
      const { data: participants } = await supabase
        .from("event_participants")
        .select("user_id")
        .eq("event_id", eventId)
        .neq("user_id", userId);

      const affectedUserIds = new Set<string>();
      (participants ?? []).forEach((p) => affectedUserIds.add(p.user_id));

      // Also add club members if the event belongs to a club
      if (effectiveClubId) {
        const { data: members } = await supabase
          .from("club_members")
          .select("user_id")
          .eq("club_id", effectiveClubId)
          .neq("user_id", userId);
        (members ?? []).forEach((m) => affectedUserIds.add(m.user_id));
      }

      // Delete the event (FK cascades handle participants, favorites, join requests)
      const { error: deleteError } = await supabase
        .from("events")
        .delete()
        .eq("id", eventId);

      if (deleteError) throw deleteError;

      // Notify all affected users
      const trimmedMsg = message?.trim();
      for (const uid of affectedUserIds) {
        await supabase.rpc("notify_user", {
          p_user_id: uid,
          p_type: "event_cancelled",
          p_title: t("events.canceled"),
          p_body: trimmedMsg
            ? t("events.canceledNotificationWithMessage", { eventName, message: trimmedMsg })
            : t("events.canceledNotification", { eventName }),
          p_data: { event_id: eventId, club_id: effectiveClubId, message: trimmedMsg ?? null },
        });
      }

      return { ok: true, notifiedCount: affectedUserIds.size };
    },
    onSuccess: (_data, { clubId }) => {
      Toast.show({ type: "success", text1: t("events.cancelSuccess") });
      void qc.invalidateQueries({ queryKey: ["club-events", clubId] });
      void qc.invalidateQueries({ queryKey: ["events"] });
      void qc.invalidateQueries({ queryKey: ["notifications"] });
      void qc.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    },
    onError: (error: any) => {
      Toast.show({
        type: "error",
        text1: error.message === "unauthorized" ? t("updateEvent.unauthorized") : t("common.error"),
      });
    },
  });
}

