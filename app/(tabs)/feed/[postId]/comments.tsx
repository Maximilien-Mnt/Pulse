import { CommentItem, type CommentRow } from "@/components/feed/CommentItem";
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/queryClient";
import { useAuthStore } from "@/stores/authStore";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function PostCommentsModal() {
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const router = useRouter();
  const userId = useAuthStore((s) => s.userId);
  const [sortLikes, setSortLikes] = useState(false);
  const [body, setBody] = useState("");

  const { data: comments = [], refetch } = useQuery({
    queryKey: ["comments", postId, sortLikes, userId],
    enabled: !!postId,
    queryFn: async () => {
      const order = sortLikes ? { column: "likes_count" as const, asc: false } : { column: "created_at" as const, asc: false };
      const { data: rows, error } = await supabase
        .from("post_comments")
        .select("*")
        .eq("post_id", postId!)
        .order(order.column, { ascending: order.asc });
      if (error) throw error;
      const ids = (rows ?? []).map((r) => r.user_id);
      if (!ids.length) return [] as CommentRow[];
      const { data: profs, error: pe } = await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url")
        .in("id", ids);
      if (pe) throw pe;
      const pmap = Object.fromEntries((profs ?? []).map((p) => [p.id, p]));
      let liked = new Set<string>();
      if (userId && rows?.length) {
        const cids = rows.map((r) => r.id);
        const { data: likes } = await supabase
          .from("comment_likes")
          .select("comment_id")
          .eq("user_id", userId)
          .in("comment_id", cids);
        liked = new Set((likes ?? []).map((l) => l.comment_id));
      }
      return (rows ?? []).map((r) => ({
        ...r,
        profiles: pmap[r.user_id] ?? null,
        liked_by_me: liked.has(r.id),
      })) as CommentRow[];
    },
  });

  const { data: count = 0 } = useQuery({
    queryKey: ["post-comments-count", postId],
    enabled: !!postId,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("post_comments")
        .select("*", { count: "exact", head: true })
        .eq("post_id", postId!);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const addMut = useMutation({
    mutationFn: async () => {
      if (!userId || !body.trim()) return;
      const { error } = await supabase.from("post_comments").insert({
        post_id: postId!,
        user_id: userId,
        body: body.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setBody("");
      void queryClient.invalidateQueries({ queryKey: ["comments", postId] });
      void queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });

  const title = useMemo(() => `Commentaires (${count})`, [count]);

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-neutral-900" edges={["top", "bottom"]}>
      <Stack.Screen options={{ title }} />
      <View className="flex-row items-center justify-between px-4 py-2 border-b border-neutral-100 dark:border-neutral-800">
        <Text className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">{title}</Text>
        <View className="flex-row items-center gap-3">
          <Pressable onPress={() => setSortLikes((s) => !s)}>
            <Text className="text-primary text-sm font-medium">{sortLikes ? "Tri : likes" : "Tri : date"}</Text>
          </Pressable>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="close" size={28} color="#64748B" />
          </Pressable>
        </View>
      </View>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <FlatList
          data={comments}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => <CommentItem comment={item} />}
          contentContainerClassName="px-4 pb-4"
        />
        <View className="flex-row items-end gap-2 px-4 py-3 border-t border-neutral-100 dark:border-neutral-800">
          <TextInput
            className="flex-1 border-2 border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-base text-neutral-900 dark:text-neutral-50 max-h-28"
            placeholder="Ton commentaire…"
            value={body}
            onChangeText={setBody}
            multiline
          />
          <Pressable
            onPress={() => addMut.mutate()}
            className="bg-primary rounded-xl p-3 mb-1"
            disabled={!body.trim()}
          >
            <Ionicons name="send" size={22} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
