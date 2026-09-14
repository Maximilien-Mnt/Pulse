// ---------------------------------------------------------------------------
// PULSE CONVERSATIONS — Message Actions Hook (Enhanced)
// ---------------------------------------------------------------------------

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

interface UseMessageActionsResult {
  deleteMessage: (messageId: string) => Promise<void>;
  editMessage: (messageId: string, newBody: string) => Promise<void>;
  canEditMessage: (message: any) => boolean;
  canDeleteMessage: (message: any) => boolean;
  isPending: boolean;
}

const EDIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

function canModifyMessage(message: any, userId: string | null): boolean {
  if (!userId || message.sender_id !== userId) return false;
  if (message.is_deleted) return false;
  const created = new Date(message.created_at).getTime();
  const now = Date.now();
  return (now - created) <= EDIT_WINDOW_MS;
}

export function useMessageActions(conversationId: string): UseMessageActionsResult {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.userId);
  const messagesKey = ['messages', conversationId];

  const del = useMutation({
    mutationFn: async (messageId: string) => {
      if (!userId) throw new Error('User not authenticated');
      const { error } = await supabase
        .from('messages')
        .update({ is_deleted: true, deleted_at: new Date().toISOString() })
        .eq('id', messageId)
        .eq('sender_id', userId);
      if (error) throw error;
    },
    onMutate: async (messageId) => {
      await queryClient.cancelQueries({ queryKey: messagesKey });
      const previous = queryClient.getQueryData<{ messages: any[]; names: Record<string, string> }>(messagesKey);
      queryClient.setQueryData(messagesKey, (old: any) =>
        old ? { ...old, messages: old.messages.map((m: any) => m.id === messageId ? { ...m, is_deleted: true } : m) } : old
      );
      return { previous };
    },
    onError: (_error, _messageId, context) => {
      if (context?.previous) queryClient.setQueryData(messagesKey, context.previous);
      void queryClient.invalidateQueries({ queryKey: messagesKey });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: messagesKey });
      void queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  const edit = useMutation({
    mutationFn: async ({ messageId, newBody }: { messageId: string; newBody: string }) => {
      if (!userId) throw new Error('User not authenticated');
      if (!newBody.trim()) throw new Error('Empty message body');
      const { error } = await supabase
        .from('messages')
        .update({ body: newBody.trim(), is_edited: true })
        .eq('id', messageId)
        .eq('sender_id', userId);
      if (error) throw error;
    },
    onMutate: async ({ messageId, newBody }) => {
      await queryClient.cancelQueries({ queryKey: messagesKey });
      const previous = queryClient.getQueryData<{ messages: any[]; names: Record<string, string> }>(messagesKey);
      queryClient.setQueryData(messagesKey, (old: any) =>
        old ? { ...old, messages: old.messages.map((m: any) => m.id === messageId ? { ...m, body: newBody.trim(), is_edited: true } : m) } : old
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(messagesKey, context.previous);
      void queryClient.invalidateQueries({ queryKey: messagesKey });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: messagesKey });
    },
  });

  const deleteMessage = useCallback(async (messageId: string) => {
    await del.mutateAsync(messageId);
  }, [del]);

  const editMessage = useCallback(async (messageId: string, newBody: string) => {
    await edit.mutateAsync({ messageId, newBody });
  }, [edit]);

  const canEditMessage = useCallback((message: any) => canModifyMessage(message, userId), [userId]);
  const canDeleteMessage = useCallback((message: any) => canModifyMessage(message, userId), [userId]);

  return {
    deleteMessage,
    editMessage,
    canEditMessage,
    canDeleteMessage,
    isPending: del.isPending || edit.isPending,
  };
}
