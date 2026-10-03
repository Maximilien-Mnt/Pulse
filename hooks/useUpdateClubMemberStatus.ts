import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import Toast from "react-native-toast-message";
import { usePostHog } from "posthog-react-native";
import { useTranslation } from "@/hooks/useTranslation";
import type { ClubMember } from "@/hooks/useClubAllMembers";
import {
  getMemberStatusLabel,
  normalizeCustomStatus,
  OTHER_MEMBER_STATUS,
  validateCustomStatus,
} from "@/lib/clubMemberStatus";

// ---------------------------------------------------------------------------
// Update a member's status inside a club
// ---------------------------------------------------------------------------
// Delegates every check (permission, self-edit protection, technical-owner
// protection, notification) to the `update_club_member_status` RPC — the
// client only validates the free-text value before calling it.
// ---------------------------------------------------------------------------

export interface UpdateMemberStatusInput {
  clubId: string;
  memberId: string;
  /** A vocabulary code (see `CLUB_MEMBER_STATUSES`) or `other`. */
  memberStatus: string;
  /** Required (and only used) when `memberStatus === "other"`. */
  customMemberStatus?: string | null;
}

export function useUpdateClubMemberStatus() {
  const qc = useQueryClient();
  const posthog = usePostHog();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({
      clubId,
      memberId,
      memberStatus,
      customMemberStatus,
    }: UpdateMemberStatusInput) => {
      const custom =
        memberStatus === OTHER_MEMBER_STATUS
          ? normalizeCustomStatus(customMemberStatus)
          : null;

      // Client-side pre-flight so the sheet can show an inline error without
      // paying a round-trip. The RPC re-validates anyway (CHECK constraint).
      if (memberStatus === OTHER_MEMBER_STATUS) {
        const invalid = validateCustomStatus(custom);
        if (invalid) {
          throw new Error(
            invalid === "customRequired" ? "CUSTOM_REQUIRED" : "CUSTOM_TOO_LONG"
          );
        }
      }

      // Notification text is authored by the caller (the actor's language) and
      // passed to the RPC, which inserts it in the same transaction as the
      // status write — never two separate calls.
      const statusLabel = getMemberStatusLabel(memberStatus, custom, t);

      const { data: club, error: clubError } = await supabase
        .from("clubs")
        .select("name")
        .eq("id", clubId)
        .single();
      if (clubError) throw clubError;

      const { data, error } = await supabase.rpc("update_club_member_status", {
        p_club_id: clubId,
        p_member_id: memberId,
        p_member_status: memberStatus,
        p_custom_member_status: custom,
        p_title: t("notifications.clubMemberStatusChanged.title"),
        p_body: t("notifications.clubMemberStatusChanged.body", {
          clubName: club?.name ?? "",
          status: statusLabel,
        }),
      });

      if (error) throw error;
      return data ?? [];
    },
    // Optimistic update: paint the badge immediately, roll back on failure.
    onMutate: async ({ clubId, memberId, memberStatus, customMemberStatus }) => {
      await qc.cancelQueries({ queryKey: ["club-all-members", clubId] });

      const previous = qc.getQueryData<ClubMember[]>([
        "club-all-members",
        clubId,
      ]);

      qc.setQueryData<ClubMember[]>(["club-all-members", clubId], (old) =>
        Array.isArray(old)
          ? old.map((member) =>
              member.user_id === memberId
                ? {
                    ...member,
                    member_status: memberStatus,
                    custom_member_status: customMemberStatus ?? null,
                  }
                : member
            )
          : old
      );

      return { previous };
    },
    onSuccess: () => {
      posthog.capture("club_member_status_changed", {});
      Toast.show({ type: "success", text1: t("members.status.saved") });
      void qc.invalidateQueries({ queryKey: ["club-all-members"] });
      void qc.invalidateQueries({ queryKey: ["club-members"] });
      void qc.invalidateQueries({ queryKey: ["notifications"] });
      void qc.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    },
    onError: (error, variables, context) => {
      // Roll back the optimistic write with the snapshot taken in `onMutate`.
      if (context?.previous !== undefined) {
        qc.setQueryData(
          ["club-all-members", variables.clubId],
          context.previous
        );
      }

      // The RPC raises uppercase SQLSTATE-style codes (see migration 058).
      const code = (error?.message ?? "").toUpperCase();
      const text1 =
        code === "CUSTOM_REQUIRED"
          ? t("members.status.customRequired")
          : code === "CUSTOM_TOO_LONG"
            ? t("members.status.customTooLong")
            : code === "CANNOT_EDIT_SELF"
              ? t("members.status.selfBlocked")
              : code === "UNAUTHORIZED" || code === "CANNOT_EDIT_OWNER"
                ? t("updateClub.unauthorized")
                : t("members.status.saveError");

      Toast.show({ type: "error", text1 });
    },
  });
}