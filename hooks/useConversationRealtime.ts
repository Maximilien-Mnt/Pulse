import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { logger } from '@/lib/reporting/logger';

type MessageChangeHandler = {
  onNewMessage?: (message: any) => void;
  onEdit?: (message: any) => void;
  onDelete?: (messageId: string) => void;
  onConversationUpdate?: (conversation: any) => void;
  onError?: (error: Error) => void;
};

export function useConversationRealtime({ conversationId, handlers, enabled = true }: { conversationId: string; handlers: MessageChangeHandler; enabled?: boolean }) {
  const qc = useQueryClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  
  useEffect(() => {
    if (!enabled || !conversationId) return;
    const channelName = 'conv-' + conversationId;
    if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null; }
    const ch = supabase.channel(channelName);
    channelRef.current = ch;
    const seenMessages = new Set<string>();
    
    ch.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: 'conversation_id=eq.' + conversationId }, async (payload) => {
      const newMessage = payload.new as any;
      if (seenMessages.has(newMessage.id)) return;
      seenMessages.add(newMessage.id);
      const cached = qc.getQueryData(['messages', conversationId]) as { messages?: any[] } | undefined;
      if (cached?.messages?.some((m: any) => m.id === newMessage.id)) return;
      handlers.onNewMessage?.(newMessage);
    });
    
    ch.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: 'conversation_id=eq.' + conversationId }, (payload) => {
      handlers.onEdit?.(payload.new);
    });
    
    ch.on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages', filter: 'conversation_id=eq.' + conversationId }, (payload) => {
      handlers.onDelete?.(payload.old.id);
    });

    // Conversation row changes (club chat rename, group photo) — pushed to
    // every active participant so the header title and the conversations list
    // update without a manual refresh.
    ch.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conversations', filter: 'id=eq.' + conversationId }, (payload) => {
      handlers.onConversationUpdate?.(payload.new);
    });

    // Subscribe and handle errors via channel state
    ch.subscribe();
    // Note: Supabase Realtime handles errors internally; we monitor via the
    // channel's state changes if needed.
    logger.debug('Realtime', 'subscribed to conversation');

    return () => {
      ch.unsubscribe();
      supabase.removeChannel(ch);
      channelRef.current = null;
    };
  }, [conversationId, enabled, handlers, qc]);
}

export function mergeNewMessage(messages: any[], newMessage: any): any[] {
  if (messages.some((m: any) => m.id === newMessage.id)) return messages;
  const insertIndex = messages.findIndex((m: any) => new Date(m.created_at) > new Date(newMessage.created_at));
  if (insertIndex === -1) return [...messages, newMessage];
  return [...messages.slice(0, insertIndex), newMessage, ...messages.slice(insertIndex)];
}

export function reconcileOptimisticMessage(messages: any[], serverMessage: any, optimisticId: string): any[] {
  return messages.map((m: any) => m.id === optimisticId ? { ...serverMessage, _optimistic: false } : m);
}
