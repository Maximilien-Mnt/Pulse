import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import Toast from "react-native-toast-message";
import { usePostHog } from "posthog-react-native";
import { t } from "@/hooks/useTranslation";

type ClubUpdateData = {
  name?: string;
  description?: string;
  short_description?: string;
  address?: string | null;
  contact_email?: string | null;
  website_url?: string | null;
  required_level?: string | null;
  league?: string | null;
  founded_date?: string | null;
  cover_url?: string | null;
  logo_url?: string | null;
  hero_urls?: string[];
};

export function useUpdateClub() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.userId);
  const posthog = usePostHog();

  return useMutation({
    mutationFn: async ({ clubId, data, oldData }: { clubId: string; data: ClubUpdateData; oldData: any }) => {
      if (!userId) throw new Error("auth");

      // Verify the current user is the club creator
      const { data: club, error: clubError } = await supabase
        .from("clubs")
        .select("created_by, name")
        .eq("id", clubId)
        .single();

      if (clubError) throw clubError;
      if (club.created_by !== userId) throw new Error("unauthorized");

      // Update the club
      const { error: updateError } = await supabase
        .from("clubs")
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq("id", clubId);

      if (updateError) throw updateError;

      // Track changes for notification
      const changes: string[] = [];
      const fieldLabels: Record<string, string> = {
        name: "Nom",
        description: "Description",
        address: "Adresse",
        contact_email: "Email de contact",
        website_url: "Site web",
        required_level: "Niveau requis",
        league: "Ligue/Division",
        founded_date: "Date de fondation",
        cover_url: "Image de couverture",
        logo_url: "Logo",
      };

      for (const [key, label] of Object.entries(fieldLabels)) {
        if (data[key as keyof ClubUpdateData] !== undefined && data[key as keyof ClubUpdateData] !== oldData[key]) {
          changes.push(label);
        }
      }

      // Send notifications to all members (except the manager)
      if (changes.length > 0) {
        const { data: members } = await supabase
          .from("club_members")
          .select("user_id")
          .eq("club_id", clubId)
          .neq("user_id", userId);

        for (const member of members ?? []) {
          await supabase.rpc("notify_user", {
            p_user_id: member.user_id,
            p_type: "club_updated",
            p_title: t("updateClub.modified"),
            p_body: `Le club "${club.name}" {t("updateClub.modifiedBodyPrefix")} ${changes.join(", ")}.`,
            p_data: { club_id: clubId, changes },
          });
        }
      }

      return { ok: true };
    },
    onSuccess: () => {
      posthog.capture("club_updated", {});
      Toast.show({ type: "success", text1: t("updateClub.updated") });
      void qc.invalidateQueries({ queryKey: ["club"] });
      void qc.invalidateQueries({ queryKey: ["club-members"] });
      void qc.invalidateQueries({ queryKey: ["notifications"] });
      void qc.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    },
    onError: (error: any) => {
      Toast.show({
        type: "error",
        text1: error.message === "unauthorized" ? t("updateClub.unauthorized") : t("updateClub.updateError"),
      });
    },
  });
}