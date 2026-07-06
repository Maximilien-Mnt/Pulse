import { MessageBubble } from "@/components/conversations/MessageBubble";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import type { Message } from "@/types";
import { Ionicons } from "@expo/vector-icons";
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
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

export default function ConversationScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const router = useRouter();
  const userId = useAuthStore((s) => s.userId);
  const qc = useQueryClient();
  const [text, setText] = useState("");

  const { data: title = "Messages" } = useQuery({
    queryKey: ["conv-title", conversationId, userId],
    enabled: !!conversationId && !!userId,
    queryFn: async () => {
      const { data: parts } = await supabase
        .from("conversation_participants")
        .select("user_id")
        .eq("conversation_id", conversationId!)
        .neq("user_id", userId!);
      const oid = parts?.[0]?.user_id;
      if (!oid) return "Messages";
      const { data: p } = await supabase.from("profiles").select("full_name").eq("id", oid).single();
      return p?.full_name ?? "Messages";
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
    const ch = supabase
      .channel(`conv-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          void qc.invalidateQueries({ queryKey: ["messages", conversationId] });
          void qc.invalidateQueries({ queryKey: ["conversations", userId] });
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [conversationId, qc, userId]);

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
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-[#0A0F1E]" edges={["top"]}>
      <Stack.Screen options={{ title }} />
      <View className="flex-row items-center px-3 py-2 border-b border-neutral-100 dark:border-neutral-800">
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color="#0F172A" />
        </Pressable>
        <Text className="flex-1 text-center text-base font-semibold text-neutral-900 dark:text-neutral-50">{title}</Text>
        <Pressable onPress={() => Toast.show({ type: "info", text1: "Fonctionnalité bientôt disponible" })}>
          <Ionicons name="settings-outline" size={22} color="#64748B" />
        </Pressable>
      </View>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={80}>
        <FlatList
          inverted
          data={dataInverted}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => (
            <MessageBubble message={item} mine={item.sender_id === userId} senderName={nameMap[item.sender_id] ?? ""} />
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
            <Ionicons name="send" size={22} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
