// ---------------------------------------------------------------------------
// PULSE CONVERSATIONS — Message actions hook
//
// Optimistic react-query mutations for the message options menu:
//   - deleteMessage: instantly removes the message from the cache, reverts
//     on error (mirrors usePostComment's pattern).
//   - editMessage: optimistically updates body + is_edited, reverts on error.
// ---------------------------------------------------------------------------

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";

export interface UseMessageActionsResult {
  deleteMessage: (messageId: string) => Promise<void>;
  editMessage: (messageId: string, newBody: string) => Promise<void>;
  isPending: boolean;
}

export function useMessageActions(conversationId: string): UseMessageActionsResult {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.userId);

  const messagesKey = ["messages", conversationId];

  const del = useMutation({
    mutationFn: async (messageId: string) => {
      if (!userId) throw new Error("User not authenticated");
      const { error } = await supabase
        .from("messages")
        .delete()
        .eq("id", messageId)
        .eq("sender_id", userId);
      if (error) throw error;
    },

    onMutate: async (messageId) => {
      await queryClient.cancelQueries({ queryKey: messagesKey });
      const previous = queryClient.getQueryData<{ messages: any[]; names: Record<string, string> }>(
        messagesKey
      );

      // Optimistically remove the message from the cache
      queryClient.setQueryData(messagesKey, (old: any) =>
        old
          ? { ...old, messages: old.messages.filter((m: any) => m.id !== messageId) }
          : old
      );

      return { previous };
    },

    onError: (_error, _messageId, context) => {
      // Revert on failure
      if (context?.previous) {
        queryClient.setQueryData(messagesKey, context.previous);
      }
      void queryClient.invalidateQueries({ queryKey: messagesKey });
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: messagesKey });
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  const edit = useMutation({
    mutationFn: async ({ messageId, newBody }: { messageId: string; newBody: string }) => {
      if (!userId) throw new Error("User not authenticated");
      if (!newBody.trim()) throw new Error("Empty message body");
      const { error } = await supabase
        .from("messages")
        .update({ body: newBody.trim(), is_edited: true })
        .eq("id", messageId)
        .eq("sender_id", userId);
      if (error) throw error;
    },

    onMutate: async ({ messageId, newBody }) => {
      await queryClient.cancelQueries({ queryKey: messagesKey });
      const previous = queryClient.getQueryData<{ messages: any[]; names: Record<string, string> }>(
        messagesKey
      );

      // Optimistically update the message body + is_edited flag
      queryClient.setQueryData(messagesKey, (old: any) =>
        old
          ? {
              ...old,
              messages: old.messages.map((m: any) =>
                m.id === messageId ? { ...m, body: newBody.trim(), is_edited: true } : m
              ),
            }
          : old
      );

      return { previous };
    },

    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(messagesKey, context.previous);
      }
      void queryClient.invalidateQueries({ queryKey: messagesKey });
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: messagesKey });
    },
  });

  const deleteMessage = useCallback(
    async (messageId: string) => {
      await del.mutateAsync(messageId);
    },
    [del]
  );

  const editMessage = useCallback(
    async (messageId: string, newBody: string) => {
      await edit.mutateAsync({ messageId, newBody });
    },
    [edit]
  );

  return {
    deleteMessage,
    editMessage,
    isPending: del.isPending || edit.isPending,
  };
}