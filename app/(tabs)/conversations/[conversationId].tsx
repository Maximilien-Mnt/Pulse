import { MessageBubble } from '@/components/conversations/MessageBubble';
import { ConversationActionSheet } from '@/components/conversations/ConversationActionSheet';
import { MessageEditModal } from '@/components/conversations/MessageEditModal';
import { useMessageActions } from '@/hooks/useMessageActions';
import { useConversationRealtime, mergeNewMessage, reconcileOptimisticMessage } from '@/hooks/useConversationRealtime';
import * as Clipboard from 'expo-clipboard';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { Message } from '@/types';
import { Icon } from '@/components/ui/Icon';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
  Keyboard,
} from 'react-native';
import { SafeScreen } from '@/components/shared/SafeScreen';
import { Avatar } from '@/components/ui/Avatar';
import { BackButton } from '@/components/ui/BackButton';
import Toast from 'react-native-toast-message';

const MESSAGES_PAGE_SIZE = 20;

export default function ConversationScreen() {
  const { conversationId, otherName, otherAvatarUrl, otherId } = useLocalSearchParams<{
    conversationId: string;
    otherName?: string;
    otherAvatarUrl?: string;
    otherId?: string;
  }>();
  const router = useRouter();
  const userId = useAuthStore((s) => s.userId);
  const qc = useQueryClient();
  const listRef = useRef<FlatList>(null);
  const scrollOffsetRef = useRef(0);
  const [text, setText] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [lastCursor, setLastCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const { deleteMessage, editMessage, canEditMessage, canDeleteMessage, isPending: messageActionPending } = useMessageActions(
    conversationId ?? ''
  );

  const handleMessageCopy = useCallback(async (content: string) => {
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(content);
      } else {
        await Clipboard.setStringAsync(content);
      }
      Toast.show({ type: 'success', text1: 'Copie' });
    } catch {
      Toast.show({ type: 'error', text1: 'Copy failed' });
    }
  }, []);

  const otherFromParams = useMemo(() => {
    if (otherId && otherName) {
      return { id: otherId, full_name: otherName, avatar_url: otherAvatarUrl || null };
    }
    return null;
  }, [otherId, otherName, otherAvatarUrl]);

  const { data: otherFromQuery, error: otherError } = useQuery<{ id: string; full_name: string | null; avatar_url: string | null } | null>({
    queryKey: ['conv-other', conversationId, userId],
    enabled: !!conversationId && !!userId && !otherFromParams,
    queryFn: async () => {
      const { data: parts, error: partsError } = await supabase
        .from('conversation_participants')
        .select('user_id')
        .eq('conversation_id', conversationId!);
      if (partsError) return null;
      const otherParticipants = parts?.filter((p: any) => p.user_id !== userId) || [];
      const oid = otherParticipants[0]?.user_id;
      if (!oid) return null;
      const { data: p, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .eq('id', oid)
        .single();
      if (profileError) return null;
      return p ? { id: p.id, full_name: p.full_name, avatar_url: p.avatar_url } : null;
    },
  });

  if (otherError) console.error('Error fetching other user:', otherError);

  const other = otherFromParams || otherFromQuery;
  const title = other?.full_name ?? otherName ?? 'Messages';
  const avatarUrl = other?.avatar_url ?? otherAvatarUrl ?? null;

  const { data: convRow } = useQuery({
    queryKey: ['conv-row', conversationId],
    enabled: !!conversationId,
    queryFn: async () => {
      const { data: row, error } = await supabase
        .from('conversations')
        .select('is_group, group_name, group_photo_url')
        .eq('id', conversationId!)
        .single();
      if (error) throw error;
      return row ?? null;
    },
  });

  const isGroupChat = convRow?.is_group ?? false;
  const groupName = convRow?.group_name ?? null;
  const groupPhotoUrl = convRow?.group_photo_url ?? null;
  const effectiveTitle = isGroupChat && groupName ? groupName : title;
  const effectiveAvatarUrl = isGroupChat && groupPhotoUrl ? groupPhotoUrl : avatarUrl;

  if (__DEV__) {
    console.log('Conversation Screen Debug:', { conversationId, userId, other, isGroupChat, groupName, title });
  }

  const { data: pinned = false } = useQuery({
    queryKey: ['conv-pinned', conversationId, userId],
    enabled: !!conversationId && !!userId,
    queryFn: async () => {
      const { data: row } = await supabase
        .from('conversation_participants')
        .select('pinned')
        .eq('conversation_id', conversationId!)
        .eq('user_id', userId!)
        .single();
      return row?.pinned ?? false;
    },
  });

  const loadMessages = useCallback(async (cursor?: string, append = false) => {
    if (!conversationId) return { messages: [], names: {} as Record<string, string>, nextCursor: null as string | null };
    
    const query = supabase
      .from('messages')
      .select('*, profiles(full_name)')
      .eq('conversation_id', conversationId!)
      .order('created_at', { ascending: true })
      .limit(MESSAGES_PAGE_SIZE);
    
    if (cursor) {
      query.lt('created_at', cursor);
    }
    
    const { data: msgs, error } = await query;
    if (error) throw error;
    
    const list = (msgs ?? []) as Message[];
    const lastMsg = list[list.length - 1];
    const nextCursor = lastMsg ? lastMsg.created_at : null;
    const hasMoreMessages = list.length === MESSAGES_PAGE_SIZE;
    
    const ids = [...new Set(list.map((m) => m.sender_id))];
    let names: Record<string, string> = {};
    if (ids.length) {
      const { data: profs } = await supabase.from('profiles').select('id, full_name').in('id', ids);
      if (profs) names = Object.fromEntries(profs.map((p) => [p.id, p.full_name]));
    }
    
    return { messages: list, names, nextCursor, hasMore: hasMoreMessages };
  }, [conversationId]);

  const messagesQuery = useQuery({
    queryKey: ['messages', conversationId, lastCursor],
    enabled: !!conversationId && !!lastCursor,
    queryFn: () => loadMessages(lastCursor ?? undefined),
  });

  const initialQuery = useQuery({
    queryKey: ['messages-initial', conversationId],
    enabled: !!conversationId,
    queryFn: async () => {
      const result = await loadMessages();
      setLastCursor(result.nextCursor);
      setHasMore(result.hasMore ?? false);
      return result;
    },
  });

  const messages = initialQuery.data?.messages ?? [];
  const nameMap = initialQuery.data?.names ?? {};

  const dataInverted = [...messages].reverse();

  const handleNewMessage = useCallback((newMessage: any) => {
    setText('');
    void qc.setQueryData(['messages-initial', conversationId], (old: any) => {
      if (!old) return old;
      return { ...old, messages: mergeNewMessage(old.messages, newMessage) };
    });
    void qc.invalidateQueries({ queryKey: ['conversations'] });
  }, [conversationId, qc]);

  const handleEdit = useCallback((editedMessage: any) => {
    void qc.setQueryData(['messages-initial', conversationId], (old: any) => {
      if (!old) return old;
      return { ...old, messages: old.messages.map((m: any) => m.id === editedMessage.id ? editedMessage : m) };
    });
  }, [conversationId, qc]);

  const handleDelete = useCallback((deletedMessageId: string) => {
    void qc.setQueryData(['messages-initial', conversationId], (old: any) => {
      if (!old) return old;
      return { ...old, messages: old.messages.map((m: any) => m.id === deletedMessageId ? { ...m, is_deleted: true } : m) };
    });
  }, [conversationId, qc]);

  useConversationRealtime({
    conversationId: conversationId ?? '',
    enabled: !!conversationId,
    handlers: {
      onNewMessage: handleNewMessage,
      onEdit: handleEdit,
      onDelete: handleDelete,
    },
  });

  const sendMut = useMutation({
    mutationFn: async () => {
      if (!userId || !text.trim()) return null;
      const clientId = 'msg-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9);
      
      const optimisticMessage = {
        id: clientId,
        conversation_id: conversationId!,
        sender_id: userId,
        body: text.trim(),
        created_at: new Date().toISOString(),
        is_deleted: false,
        is_edited: false,
        type: 'text' as const,
        _optimistic: true,
      };
      
      void qc.setQueryData(['messages-initial', conversationId], (old: any) => {
        if (!old) return { messages: [optimisticMessage], names: {} };
        return { ...old, messages: [...old.messages, optimisticMessage] };
      });
      
      const { data, error } = await supabase.from('messages').insert({
        conversation_id: conversationId!,
        sender_id: userId,
        body: text.trim(),
      }).select().single();
      
      if (error) {
        void qc.setQueryData(['messages-initial', conversationId], (old: any) => {
          if (!old) return old;
          return { ...old, messages: old.messages.filter((m: any) => m.id !== clientId) };
        });
        throw error;
      }
      
      return data;
    },
    onSuccess: (serverMessage: any) => {
      if (serverMessage) {
        void qc.setQueryData(['messages-initial', conversationId], (old: any) => {
          if (!old) return old;
          return { ...old, messages: reconcileOptimisticMessage(old.messages, serverMessage, serverMessage.id) };
        });
      }
      setText('');
      void qc.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: () => {
      Toast.show({ type: 'error', text1: 'Send failed' });
    },
  });

  const loadOlder = useCallback(async () => {
    if (!hasMore || !lastCursor) return;
    const result = await loadMessages(lastCursor);
    setLastCursor(result.nextCursor);
    setHasMore(result.hasMore ?? false);
    
    void qc.setQueryData(['messages-initial', conversationId], (old: any) => {
      if (!old) return { messages: result.messages, names: result.names };
      return { ...old, messages: [...result.messages, ...old.messages] };
    });
  }, [hasMore, lastCursor, conversationId, loadMessages, qc]);

  const scrollToBottom = useCallback(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  const handleTextChange = useCallback((newText: string) => {
    setText(newText);
    scrollToBottom();
  }, [scrollToBottom]);

  const keyboardHeight = Platform.OS === 'ios' ? 44 : 0;

  return (
    <SafeScreen className='flex-1 bg-neutral-50 dark:bg-[#0A0F1E]' edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View className='flex-row items-center px-3 py-2 border-b border-neutral-100 dark:border-neutral-800'>
        <BackButton fallbackRoute='/(tabs)/conversations' alwaysUseFallbackRoute />
        <Pressable
          className='flex-1 flex-row items-center gap-2 pl-1'
          onPress={() => { if (!isGroupChat && other?.id) router.push('/profile/' + other.id); }}
        >
          <Avatar uri={effectiveAvatarUrl} size={36} />
          <Text className='text-base font-semibold text-neutral-900 dark:text-neutral-50' numberOfLines={1}>
            {effectiveTitle}
          </Text>
        </Pressable>
        <Pressable onPress={() => setMenuOpen(true)}>
          <Icon name='Settings' size={22} color='text-secondary' />
        </Pressable>
      </View>
      
      <KeyboardAvoidingView className='flex-1' behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={80 + keyboardHeight}>
        <FlatList
          ref={listRef}
          inverted
          data={dataInverted}
          keyExtractor={(m) => m.id}
          onScroll={(e) => { scrollOffsetRef.current = e.nativeEvent.contentOffset.y; }}
          onEndReached={loadOlder}
          onEndReachedThreshold={0.5}
          renderItem={({ item }) => {
            const isMine = item.sender_id === userId;
            const canModify = isMine && canEditMessage(item);
            const isDeleted = item.is_deleted;
            
            if (isDeleted) {
              return (
                <View className='my-2 ml-4'>
                  <Text className='text-sm text-neutral-400 italic'>Message deleted</Text>
                </View>
              );
            }
            
            return (
              <MessageBubble
                text={item.body ?? ''}
                isMine={isMine}
                type={item.type}
                isEdited={item.is_edited}
                canModify={canModify}
                isDeleting={messageActionPending}
                onCopy={() => handleMessageCopy(item.body ?? '')}
                onEdit={() => setEditingMessage(item)}
                onDelete={() => deleteMessage(item.id)}
              />
            );
          }}
          contentContainerClassName='px-4 py-3'
          ListEmptyComponent={
            <View className='flex-1 items-center justify-center py-12'>
              <Text className='text-neutral-400 text-center'>No messages yet</Text>
            </View>
          }
        />
        
        <View className='flex-row items-end gap-2 px-3 py-2 border-t border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900'>
          <TextInput
            className='flex-1 border-2 border-neutral-200 dark:border-neutral-700 rounded-2xl px-3 py-2 text-base text-neutral-900 dark:text-neutral-50 max-h-24 min-h-[44px]'
            placeholder='Message...'
            placeholderTextColor='#94A3B8'
            multiline
            value={text}
            onChangeText={handleTextChange}
            onSubmitEditing={() => sendMut.mutate()}
            returnKeyType='send'
          />
          <Pressable 
            onPress={() => sendMut.mutate()}
            disabled={!text.trim() || sendMut.isPending}
            className='bg-primary rounded-full p-3 '
          >
            {sendMut.isPending ? (
              <View className='w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin' />
            ) : (
              <Icon name='Send' size={22} color='white' />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <ConversationActionSheet
        visible={menuOpen}
        conversationId={conversationId ?? ''}
        name={effectiveTitle}
        pinned={pinned}
        onClose={() => setMenuOpen(false)}
        onDeleted={() => router.back()}
        targetAuthorId={other?.id}
        isGroup={isGroupChat}
        groupName={groupName ?? undefined}
        onLeft={() => router.back()}
      />

      <MessageEditModal
        visible={!!editingMessage}
        initialText={editingMessage?.body ?? ''}
        saving={messageActionPending}
        onClose={() => setEditingMessage(null)}
        onSave={async (newText) => {
          if (!editingMessage || !newText) return;
          await editMessage(editingMessage.id, newText);
          setEditingMessage(null);
        }}
      />
    </SafeScreen>
  );
}
