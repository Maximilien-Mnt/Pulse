import { MessageBubble } from "@/components/conversations/MessageBubble";
import { ConversationActionSheet } from "@/components/conversations/ConversationActionSheet";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import type { Message } from "@/types";
import { Icon } from "@/components/ui/Icon";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeScreen } from "@/components/shared/SafeScreen";
import { Avatar } from "@/components/ui/Avatar";
import { BackButton } from "@/components/ui/BackButton";
import Toast from "react-native-toast-message";

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
  const [text, setText] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  // Use params from navigation as primary source, fallback to query if not available
  const otherFromParams = useMemo(() => {
    if (otherId && otherName) {
      return {
        id: otherId,
        full_name: otherName,
        avatar_url: otherAvatarUrl || null,
      };
    }
    return null;
  }, [otherId, otherName, otherAvatarUrl]);

  const { data: otherFromQuery, error: otherError } = useQuery<{
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null>({
    queryKey: ["conv-other", conversationId, userId],
    enabled: !!conversationId && !!userId && !otherFromParams,
    queryFn: async () => {
      const { data: parts, error: partsError } = await supabase
        .from("conversation_participants")
        .select("user_id")
        .eq("conversation_id", conversationId!);
      
      if (partsError) {
        console.error("Error fetching participants:", partsError);
        return null;
      }
      
      const otherParticipants = parts?.filter((p: any) => p.user_id !== userId) || [];
      const oid = otherParticipants[0]?.user_id;
      
      if (!oid) {
        console.log("No other participant found in conversation:", conversationId);
        return null;
      }
      
      const { data: p, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .eq("id", oid)
        .single();
      
      if (profileError) {
        console.error("Error fetching profile for user:", oid, profileError);
        return null;
      }
      
      return p
        ? { id: p.id, full_name: p.full_name, avatar_url: p.avatar_url }
        : null;
    },
  });

  if (otherError) {
    console.error("Error fetching other user:", otherError);
  }

  // Use params first, fallback to query result
  const other = otherFromParams || otherFromQuery;
  const title = other?.full_name ?? otherName ?? "Messages";
  const avatarUrl = other?.avatar_url ?? otherAvatarUrl ?? null;

  // Debug logging (only in development)
  if (__DEV__) {
    console.log("Conversation Screen Debug:", {
      conversationId,
      userId,
      otherFromParams: !!otherFromParams,
      otherFromQuery: !!otherFromQuery,
      other: !!other,
      title,
      hasAvatar: !!avatarUrl,
    });
  }

  const { data: pinned = false } = useQuery({
    queryKey: ["conv-pinned", conversationId, userId],
    enabled: !!conversationId && !!userId,
    queryFn: async () => {
      const { data: row } = await supabase
        .from("conversation_participants")
        .select("pinned")
        .eq("conversation_id", conversationId!)
        .eq("user_id", userId!)
        .single();
      return row?.pinned ?? false;
    },
  });

  const { data } = useQuery({
    queryKey: ["messages", conversationId],
    enabled: !!conversationId,
    queryFn: async () => {
      const { data: msgs, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      const list = (msgs ?? []) as Message[];
      const ids = [...new Set(list.map((m) => m.sender_id))];
      let names: Record<string, string> = {};
      if (ids.length) {
        const { data: profs, error: pe } = await supabase.from("profiles").select("id, full_name").in("id", ids);
        if (!pe && profs) names = Object.fromEntries(profs.map((p) => [p.id, p.full_name]));
      }
      return { messages: list, names };
    },
  });

  const messages = data?.messages ?? [];
  const nameMap = data?.names ?? {};

  useEffect(() => {
    if (!conversationId) return;
    // Use a unique channel name per effect run so React StrictMode's
    // double-mount doesn't reattach callbacks to an already-subscribed
    // channel (which throws "cannot add postgres_changes callbacks ...
    // after subscribe()").
    const channelName = `conv-${conversationId}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    const ch = supabase.channel(channelName);
    ch.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      () => {
        void qc.invalidateQueries({ queryKey: ["messages", conversationId] });
        void qc.invalidateQueries({ queryKey: ["conversations"] });
      }
    );
    ch.subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [conversationId, qc]);

  const sendMut = useMutation({
    mutationFn: async () => {
      if (!userId || !text.trim()) return;
      const { error } = await supabase.from("messages").insert({
        conversation_id: conversationId!,
        sender_id: userId,
        body: text.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setText("");
      void qc.invalidateQueries({ queryKey: ["messages", conversationId] });
    },
    onError: () => Toast.show({ type: "error", text1: "Envoi impossible" }),
  });

  const dataInverted = useMemo(() => [...messages].reverse(), [messages]);

  return (
    <SafeScreen className="flex-1 bg-neutral-50 dark:bg-[#0A0F1E]" edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-row items-center px-3 py-2 border-b border-neutral-100 dark:border-neutral-800">
        <BackButton fallbackRoute="/(tabs)/conversations" alwaysUseFallbackRoute />
        <Pressable
          className="flex-1 flex-row items-center gap-2 pl-1"
          onPress={() => {
            if (other?.id) router.push(`/profile/${other.id}`);
          }}
        >
          <Avatar uri={avatarUrl} size={36} />
          <Text
            className="text-base font-semibold text-neutral-900 dark:text-neutral-50"
            numberOfLines={1}
          >
            {title}
          </Text>
        </Pressable>
        <Pressable onPress={() => setMenuOpen(true)}>
          <Icon name="Settings" size={22} color="text-secondary" />
        </Pressable>
      </View>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={80}>
        <FlatList
          inverted
          data={dataInverted}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => (
            <MessageBubble
              text={item.body ?? ""}
              isMine={item.sender_id === userId}
              type={item.type}
            />
          )}
          contentContainerClassName="px-4 py-3"
        />
        <View className="flex-row items-end gap-2 px-3 py-2 border-t border-neutral-100 dark:border-neutral-800">
          <TextInput
            className="flex-1 border-2 border-neutral-200 dark:border-neutral-700 rounded-2xl px-3 py-2 text-base text-neutral-900 dark:text-neutral-50 max-h-24"
            placeholder="Message…"
            placeholderTextColor="#94A3B8"
            multiline
            value={text}
            onChangeText={setText}
          />
          <Pressable onPress={() => sendMut.mutate()} className="bg-primary rounded-full p-3">
            <Icon name="Send" size={22} color="white" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <ConversationActionSheet
        visible={menuOpen}
        conversationId={conversationId ?? ""}
        name={title}
        pinned={pinned}
        onClose={() => setMenuOpen(false)}
        onDeleted={() => router.back()}
        targetAuthorId={other?.id}
      />
    </SafeScreen>
  );
}
