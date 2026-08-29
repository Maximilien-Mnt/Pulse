import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import Toast from "react-native-toast-message";
import { usePostHog } from "posthog-react-native";
import { t } from "@/hooks/useTranslation";

type EventUpdateData = {
  name?: string;
  description?: string;
  short_description?: string;
  venue_address?: string | null;
  website_url?: string | null;
  registration_url?: string | null;
  required_level?: string | null;
  start_date?: string;
  end_date?: string | null;
  price_cents?: number;
  is_paid?: boolean;
  difficulty?: number;
  category?: string | null;
  places_total?: number | null;
  logo_url?: string | null;
  hero_urls?: string[];
};

export function useUpdateEvent() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.userId);
  const posthog = usePostHog();

  return useMutation({
    mutationFn: async ({ eventId, data, oldData }: { eventId: string; data: EventUpdateData; oldData: any }) => {
      if (!userId) throw new Error("auth");

      // Verify the current user is the event creator
      const { data: event, error: eventError } = await supabase
        .from("events")
        .select("created_by, name")
        .eq("id", eventId)
        .single();

      if (eventError) throw eventError;
      if (event.created_by !== userId) throw new Error("unauthorized");

      // Update the event
      const { error: updateError } = await supabase
        .from("events")
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq("id", eventId);

      if (updateError) throw updateError;

      // Track changes for notification
      const changes: string[] = [];
      const fieldLabels: Record<string, string> = {
        name: "Nom",
        description: "Description",
        venue_address: "Adresse",
        website_url: "Site web",
        registration_url: "Lien d'inscription",
        required_level: "Niveau requis",
        start_date: t("updateEvent.dateLabel"),
        end_date: "Date de fin",
        price_cents: "Prix",
        difficulty: t("updateEvent.difficultyLabel"),
        category: t("updateEvent.categoryLabel"),
        places_total: "Nombre de places",
      };

      for (const [key, label] of Object.entries(fieldLabels)) {
        if (data[key as keyof EventUpdateData] !== undefined && data[key as keyof EventUpdateData] !== oldData[key]) {
          changes.push(label);
        }
      }

      // Send notifications to all participants (except the manager)
      if (changes.length > 0) {
        const { data: participants } = await supabase
          .from("event_participants")
          .select("user_id")
          .eq("event_id", eventId)
          .neq("user_id", userId);

        for (const participant of participants ?? []) {
          await supabase.rpc("notify_user", {
            p_user_id: participant.user_id,
            p_type: "event_updated",
            p_title: t("updateEvent.modified"),
            p_body: `L'événement "${event.name}" {t("updateEvent.modifiedBodyPrefix")} ${changes.join(", ")}.`,
            p_data: { event_id: eventId, changes },
          });
        }
      }

      return { ok: true };
    },
    onSuccess: () => {
      posthog.capture("event_updated", {});
      Toast.show({ type: "success", text1: t("updateEvent.updated") });
      void qc.invalidateQueries({ queryKey: ["event"] });
      void qc.invalidateQueries({ queryKey: ["event-participants"] });
      void qc.invalidateQueries({ queryKey: ["notifications"] });
      void qc.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    },
    onError: (error: any) => {
      Toast.show({
        type: "error",
        text1: error.message === "unauthorized" ? t("updateEvent.unauthorized") : "Impossible de mettre à jour l'événement",
      });
    },
  });
}