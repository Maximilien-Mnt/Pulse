// ---------------------------------------------------------------------------
// PULSE — Report hook
//
// Generic mutation that inserts into the shared `reports` table. The table is
// generic (target_type / target_id) so the *same* hook + flow works for every
// reportable entity: posts, profiles, messages, conversations.
//
// Mirror: hooks/useFollow.ts, hooks/useContactUser.ts
// ---------------------------------------------------------------------------

import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { t } from "@/hooks/useTranslation";

/**
 * What kind of entity is being reported. Maps directly to the `target_type`
 * column of the `reports` table (see supabase/migrations/001_initial.sql).
 */
export type ReportTargetType = "post" | "profile" | "message" | "conversation";

export interface UseReportPayload {
  /** The entity being reported. */
  targetType: ReportTargetType;
  /** Primary key of the reported entity (post id, profile id, …). */
  targetId: string;
  /**
   * Author id of the reported entity. Passed in by the caller so the hook can
   * reject self-reports without an extra DB round-trip. For a profile report
   * this is the target's own id.
   */
  targetAuthorId?: string;
  /** Selected reason category (e.g. "Harassment"). Stored in `metadata`. */
  reason?: string;
  /** Optional free-text message from the reporter. */
  message?: string;
}

/**
 * Report any target into the shared `reports` table.
 *
 * - Guards against reporting your own content (targetAuthorId === userId).
 * - Trims the message and stores the reason in `metadata` so the row stays
 *   schema-agnostic across target types.
 * - On success, invalidates the `["reports"]` query key so a future "my reports"
 *   view can refresh.
 */
export function useReport() {
  const userId = useAuthStore((s) => s.userId);
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UseReportPayload) => {
      if (!userId) throw new Error(t("report.notConnected"));

      const { targetType, targetId, targetAuthorId, reason, message } = payload;

      // Prevent a user from reporting their own content/profile.
      if (targetAuthorId === userId) {
        throw new Error("Vous ne pouvez pas signaler votre propre contenu.");
      }

      const { error } = await supabase.from("reports").insert({
        reporter_id: userId,
        target_type: targetType,
        target_id: targetId,
        message: message && message.trim().length > 0 ? message.trim() : null,
        metadata: { reason: reason ?? null },
      });

      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["reports"] });
    },
  });
}
