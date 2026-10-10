import { MessageBubble } from '@/components/conversations/MessageBubble';
import { ConversationActionSheet } from '@/components/conversations/ConversationActionSheet';
import { MessageEditModal } from '@/components/conversations/MessageEditModal';
import { useMessageActions } from '@/hooks/useMessageActions';
import { useConversationRealtime, mergeNewMessage } from '@/hooks/useConversationRealtime';
import * as Clipboard from 'expo-clipboard';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { Message } from '@/types';
import { Icon } from '@/components/ui/Icon';
import { SendButton } from '@/components/ui/SendButton';
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
import type { ActionMenuAnchor } from '@/components/shared/ActionMenuPopover';
import { Avatar } from '@/components/ui/Avatar';
import { BackButton } from '@/components/ui/BackButton';
import Toast from 'react-native-toast-message';
import { reportError } from '@/lib/reporting/errorReport';

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
  const authInitialized = useAuthStore((s) => s.initialized);
  // Gate all message reads on auth being resolved: on cold start the Supabase
  // JWT may not be loaded yet and RLS would return 0 rows (success) which we
  // must never cache/show as "no messages".
  const authReady = authInitialized && !!userId;
  // Single canonical cache key for this conversation's messages. Memoized so
  // realtime/edit/delete callbacks keep stable references.
  const MESSAGES_KEY = useMemo(
    () => ['messages', conversationId] as unknown as readonly unknown[],
    [conversationId],
  );
  const qc = useQueryClient();
  const listRef = useRef<FlatList>(null);
  const scrollOffsetRef = useRef(0);
  const [text, setText] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  // On-screen rect of the header settings gear, used to anchor the floating
  // options menu next to the button — same pattern as ConversationItem/MessageBubble.
  const [menuAnchor, setMenuAnchor] = useState<ActionMenuAnchor | null>(null);
  const settingsRef = useRef<View>(null);
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

  // Measure the header gear's window rect, then open: iOS ignores the rect and
  // presents the real system action sheet; Android/web anchor the same clean
  // floating menu next to the button (fully-visible clamp + outside-tap close).
  const openSettingsMenu = useCallback(() => {
    const node = settingsRef.current;
    const open = (anchor: ActionMenuAnchor | null) => {
      setMenuAnchor(anchor);
      setMenuOpen(true);
    };
    if (node && typeof node.measureInWindow === 'function') {
      let settled = false;
      try {
        node.measureInWindow((x, y, width, height) => {
          if (!settled) {
            settled = true;
            open({ x, y, width, height });
          }
        });
      } catch {
        open(null);
        return;
      }
      // Safety net: test renderers expose measureInWindow but never invoke its
      // callback — the menu trigger must never hang.
      setTimeout(() => {
        if (!settled) {
          settled = true;
          open(null);
        }
      }, 50);
    } else {
      open(null);
    }
  }, []);

  const closeSettingsMenu = useCallback(() => {
    setMenuOpen(false);
    setMenuAnchor(null);
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

  if (otherError) reportError(otherError, { operation: "conversations.otherUser", route: "/conversations" });

  const other = otherFromParams || otherFromQuery;
  const title = other?.full_name ?? otherName ?? 'Messages';
  const avatarUrl = other?.avatar_url ?? otherAvatarUrl ?? null;

  const { data: convRow } = useQuery({
    queryKey: ['conv-row', conversationId],
    enabled: !!conversationId && authReady,
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

  // Debug state is inspected via React DevTools; never log payloads here.

  const { data: pinned = false } = useQuery({
    queryKey: ['conv-pinned', conversationId, userId],
    enabled: !!conversationId && authReady,
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

  const loadMessages = useCallback(async (cursor?: string) => {
    if (!conversationId) return { messages: [], names: {} as Record<string, string>, nextCursor: null as string | null, hasMore: false };
    // Newest-first page: fetch the latest PAGE, then sort ASC for display.
    // This guarantees recent messages are always visible even in long histories.
    const query = supabase
      .from('messages')
      .select('*, profiles(full_name)')
      .eq('conversation_id', conversationId!)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(MESSAGES_PAGE_SIZE);

    if (cursor) {
      query.lt('created_at', cursor);
    }

    const { data: msgs, error } = await query;
    if (error) throw error;

    const pageDesc = ((msgs ?? []) as Message[]).slice();
    // Display order is ASC (oldest -> newest).
    const list = pageDesc.slice().reverse();
    const oldest = list[0];
    const nextCursor = pageDesc.length === MESSAGES_PAGE_SIZE && oldest ? oldest.created_at : null;
    const hasMoreMessages = pageDesc.length === MESSAGES_PAGE_SIZE;

    const ids = [...new Set(list.map((m) => m.sender_id))];
    let names: Record<string, string> = {};
    if (ids.length) {
      const { data: profs } = await supabase.from('profiles').select('id, full_name').in('id', ids);
      if (profs) names = Object.fromEntries(profs.map((p) => [p.id, p.full_name]));
    }

    return { messages: list, names, nextCursor, hasMore: hasMoreMessages };
  }, [conversationId]);

  const initialQuery = useQuery({
    queryKey: MESSAGES_KEY,
    enabled: !!conversationId && authReady,
    // Never serve a stale empty list from a previous cold-start race:
    // messages must always refetch once auth is ready.
    staleTime: 0,
    gcTime: 1000 * 60 * 60 * 24,
    queryFn: () => loadMessages(),
  });

  // Keep pagination cursors as derived effects — never setState inside queryFn.
  useEffect(() => {
    const d = initialQuery.data;
    if (!d) return;
    setLastCursor(d.nextCursor ?? null);
    setHasMore(d.hasMore ?? false);
  }, [initialQuery.data]);

  const messages = initialQuery.data?.messages ?? [];
  const nameMap = initialQuery.data?.names ?? {};

  const dataInverted = [...messages].reverse();

  const handleNewMessage = useCallback((newMessage: any) => {
    setText('');
    void qc.setQueryData(MESSAGES_KEY, (old: any) => {
      if (!old) return old;
      return { ...old, messages: mergeNewMessage(old.messages, newMessage) };
    });
    void qc.invalidateQueries({ queryKey: ['conversations'] });
  }, [MESSAGES_KEY, qc]);

  const handleEdit = useCallback((editedMessage: any) => {
    void qc.setQueryData(MESSAGES_KEY, (old: any) => {
      if (!old) return old;
      return { ...old, messages: old.messages.map((m: any) => m.id === editedMessage.id ? editedMessage : m) };
    });
  }, [MESSAGES_KEY, qc]);

  const handleDelete = useCallback((deletedMessageId: string) => {
    void qc.setQueryData(MESSAGES_KEY, (old: any) => {
      if (!old) return old;
      return { ...old, messages: old.messages.map((m: any) => m.id === deletedMessageId ? { ...m, is_deleted: true } : m) };
    });
  }, [MESSAGES_KEY, qc]);

  // Broadcast handler: another participant renamed the chat (or changed the
  // group photo). Patch the caches so this client never needs a refresh.
  //
  // NOTE: public.conversations is also UPDATEd on *every* message insert by
  // touch_conversation_on_message() (last_message_at, last_message_preview,
  // updated_at). Most events that reach this handler are therefore irrelevant,
  // so each cache updater returns the previous reference untouched unless the
  // fields we render actually changed — otherwise the header (and lists) would
  // re-render on every incoming message.
  const handleConversationUpdate = useCallback((row: any) => {
    if (!row?.id) return;
    // Header of the open chat — instant title/photo update.
    void qc.setQueryData(['conv-row', conversationId], (old: any) => {
      if (!old) return old;
      const nextName = row.group_name ?? old.group_name;
      const nextPhoto = row.group_photo_url ?? old.group_photo_url;
      if (nextName === old.group_name && nextPhoto === old.group_photo_url) return old;
      return { ...old, group_name: nextName, group_photo_url: nextPhoto };
    });
    // Every cached conversations list (private/public variants) so the rename
    // is already applied when the user navigates back to the tab.
    qc.setQueriesData({ queryKey: ['conversations'] }, (old: any) => {
      if (!Array.isArray(old)) return old;
      let changed = false;
      const next = old.map((item: any) => {
        if (item?.conversation?.id !== row.id) return item;
        const nextName = row.group_name ?? item.conversation.group_name;
        const nextPhoto = row.group_photo_url ?? item.conversation.group_photo_url;
        if (
          nextName === item.conversation.group_name &&
          nextPhoto === item.conversation.group_photo_url
        ) {
          return item;
        }
        changed = true;
        return {
          ...item,
          conversation: { ...item.conversation, group_name: nextName, group_photo_url: nextPhoto },
        };
      });
      return changed ? next : old;
    });
  }, [conversationId, qc]);

  // Memoized: the hook lists `handlers` in its effect dependencies, so an
  // inline object would tear down and re-create the realtime channel on every
  // render.
  const realtimeHandlers = useMemo(
    () => ({
      onNewMessage: handleNewMessage,
      onEdit: handleEdit,
      onDelete: handleDelete,
      onConversationUpdate: handleConversationUpdate,
    }),
    [handleNewMessage, handleEdit, handleDelete, handleConversationUpdate],
  );

  useConversationRealtime({
    conversationId: conversationId ?? '',
    enabled: !!conversationId,
    handlers: realtimeHandlers,
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
      
      void qc.setQueryData(MESSAGES_KEY, (old: any) => {
        if (!old) return { messages: [optimisticMessage], names: {} };
        return { ...old, messages: [...old.messages, optimisticMessage] };
      });
      
      const { data, error } = await supabase.from('messages').insert({
        conversation_id: conversationId!,
        sender_id: userId,
        body: text.trim(),
      }).select().single();
      
      if (error) {
        void qc.setQueryData(MESSAGES_KEY, (old: any) => {
          if (!old) return old;
          return { ...old, messages: old.messages.filter((m: any) => m.id !== clientId) };
        });
        throw error;
      }
      
      return { clientId, serverMessage: data };
    },
    onSuccess: (result: any) => {
      const serverMessage = result?.serverMessage;
      if (serverMessage) {
        const clientId = result.clientId as string;
        void qc.setQueryData(MESSAGES_KEY, (old: any) => {
          if (!old) return old;
          // Drop the optimistic placeholder (keyed by clientId), then add the
          // authoritative server row. mergeNewMessage dedupes by id, so if the
          // realtime INSERT already added this row we never double it.
          const base = old.messages.filter((m: any) => m.id !== clientId);
          return { ...old, messages: mergeNewMessage(base, { ...serverMessage, _optimistic: false }) };
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

    void qc.setQueryData(MESSAGES_KEY, (old: any) => {
      if (!old) return { messages: result.messages, names: result.names };
      // Dedupe by id: concurrent realtime INSERTs may already contain rows.
      const seen = new Set(result.messages.map((m: any) => m.id));
      const existing = old.messages.filter((m: any) => !seen.has(m.id));
      const names = { ...result.names, ...old.names };
      return { ...old, messages: [...result.messages, ...existing], names };
    });
  }, [hasMore, lastCursor, MESSAGES_KEY, loadMessages, qc]);

  const scrollToBottom = useCallback(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  

// Stable reference for the send handler.
const handleSend = useCallback(() => {
  sendMut.mutate();
}, [sendMut]);

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
        <Pressable
          ref={settingsRef}
          onPress={openSettingsMenu}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Conversation settings"
          testID="conversation-settings"
        >
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
            onSubmitEditing={handleSend}
            returnKeyType='send'
          />
          <SendButton
            label="Envoyer le message"
            disabled={!text.trim() || sendMut.isPending}
            loading={sendMut.isPending}
            onPress={handleSend}
          />
        </View>
      </KeyboardAvoidingView>

      <ConversationActionSheet
        visible={menuOpen}
        conversationId={conversationId ?? ''}
        name={effectiveTitle}
        pinned={pinned}
        onClose={closeSettingsMenu}
        onDeleted={() => {
          closeSettingsMenu();
          router.back();
        }}
        targetAuthorId={other?.id}
        isGroup={isGroupChat}
        groupName={groupName ?? undefined}
        anchor={menuAnchor}
        onLeft={() => {
          closeSettingsMenu();
          router.back();
        }}
        onRenamed={(newName) => {
          // Belt-and-braces: the mutation already updates this cache key
          // optimistically, but this guarantees the header reflects the new
          // name instantly even if the mutation ran before conv-row loaded.
          qc.setQueryData(['conv-row', conversationId], (old: any) =>
            old ? { ...old, group_name: newName } : old,
          );
        }}
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

