import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { t } from "@/hooks/useTranslation";

/**
 * Mutations pour les actions de conversation : épingler, désépingler, supprimer.
 * Chaque mutation invalide la liste des conversations pour refléter les changements.
 */
export function usePinConversation() {
  const userId = useAuthStore((s) => s.userId);
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      if (!userId) throw new Error(t("report.notConnected"));
      // Try with pinned_at first; fall back to just pinned if column doesn't exist
      const { error } = await supabase
        .from("conversation_participants")
        .update({ pinned: true, pinned_at: new Date().toISOString() })
        .eq("conversation_id", conversationId)
        .eq("user_id", userId);
      if (error && error.code === "42703") {
        // pinned_at column doesn't exist — fall back to just pinned
        const { error: e2 } = await supabase
          .from("conversation_participants")
          .update({ pinned: true })
          .eq("conversation_id", conversationId)
          .eq("user_id", userId);
        if (e2) throw e2;
      } else if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["conversations"] });
      void qc.invalidateQueries({ queryKey: ["conv-pinned"] });
    },
  });
}

export function useUnpinConversation() {
  const userId = useAuthStore((s) => s.userId);
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      if (!userId) throw new Error(t("report.notConnected"));
      // Try with pinned_at first; fall back to just pinned if column doesn't exist
      const { error } = await supabase
        .from("conversation_participants")
        .update({ pinned: false, pinned_at: null })
        .eq("conversation_id", conversationId)
        .eq("user_id", userId);
      if (error && error.code === "42703") {
        // pinned_at column doesn't exist — fall back to just pinned
        const { error: e2 } = await supabase
          .from("conversation_participants")
          .update({ pinned: false })
          .eq("conversation_id", conversationId)
          .eq("user_id", userId);
        if (e2) throw e2;
      } else if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["conversations"] });
      void qc.invalidateQueries({ queryKey: ["conv-pinned"] });
    },
  });
}

export function useDeleteConversation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      const { error } = await supabase.rpc("delete_conversation_for_me", {
        p_conv_id: conversationId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

/**
 * Lets a participant quit a group chat without leaving the club.
 * Uses the SECURITY DEFINER RPC which soft-deletes (left_at) the caller's
 * participant row for the given group conversation.
 */
export function useLeaveGroupConversation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      const { error } = await supabase.rpc("leave_group_conversation", {
        p_conv_id: conversationId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

/**
 * Renames a group conversation (e.g. a club chat). Only group_name is touched,
 * so the underlying club name is never modified.
 */
export function useRenameGroupConversation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conversationId,
      groupName,
    }: {
      conversationId: string;
      groupName: string;
    }) => {
      const name = groupName.trim();
      if (!name) throw new Error(t("conv.nameRequired"));
      const { error } = await supabase
        .from("conversations")
        .update({ group_name: name })
        .eq("id", conversationId);
      if (error) throw error;
      return { conversationId, groupName: name };
    },
    onMutate: async ({ conversationId, groupName }) => {
      const name = groupName.trim();
      const queryKey = ["conv-row", conversationId];
      await qc.cancelQueries({ queryKey });
      const previous = qc.getQueryData<{
        is_group: boolean;
        group_name: string | null;
        group_photo_url: string | null;
      } | null>(queryKey);
      if (previous) {
        qc.setQueryData(queryKey, { ...previous, group_name: name });
      }
      return { previous, queryKey };
    },
    onError: (_e, _v, context) => {
      if (context?.previous !== undefined) {
        qc.setQueryData(context.queryKey, context.previous);
      }
    },
    onSuccess: (data) => {
      // Patch the header synchronously so the title changes on the spot,
      // before the background refetch below resolves.
      qc.setQueryData<{ group_name?: string | null } | null>(
        ["conv-row", data.conversationId],
        (old) => (old ? { ...old, group_name: data.groupName } : old),
      );
    },
    onSettled: (_d, _e, variables) => {
      // Refresh the conversations tab list and reconcile the header with the
      // server value (or restore the truth after a failure).
      void qc.invalidateQueries({ queryKey: ["conversations"] });
      if (variables?.conversationId) {
        void qc.invalidateQueries({ queryKey: ["conv-row", variables.conversationId] });
      }
    },
  });
}