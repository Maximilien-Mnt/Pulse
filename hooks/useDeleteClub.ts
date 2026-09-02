import { supabase } from "@/lib/supabase";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import type { Club } from "@/types";
import { t } from "@/hooks/useTranslation";

/**
 * Deletes a club, all its events and all related data, and notifies everyone:
 * - Calls the `delete_club_full` SECURITY DEFINER RPC which atomically:
 *   - notifies every club member (club_deleted)
 *   - notifies every participant of the club''s events (event_deleted)
 *   - deletes the club''s events (+ participants, favorites, join requests)
 *   - deletes the club (FK cascades: members, favorites, join requests, chats)
 * The translated notification titles/bodies are passed as parameters so the
 * notifications are localized on the client.
 */
export function useDeleteClub() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.userId);

  return useMutation({
    mutationFn: async ([clubId, clubName]: [string, string]) => {
      if (!userId) throw new Error("Not authenticated");

      const { error } = await supabase.rpc("delete_club_full", {
        p_club_id: clubId,
        p_club_title: t("deleteClub.success"),
        p_club_body: t("deleteClub.body", { clubName }),
        p_event_title: t("deleteClub.eventTitle"),
        p_event_body: t("deleteClub.eventBody", { clubName }),
      });

      if (error) throw error;
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
      void qc.invalidateQueries({ queryKey: ["events"] });
      void qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
