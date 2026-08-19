// ---------------------------------------------------------------------------
// PULSE FEED — Comment Panel
// Slide-in panel from right side showing comments for a post
// ---------------------------------------------------------------------------

import React, { useMemo, useState } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  TextInput,
  View,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import { supabase } from "@/lib/supabase";
import { CommentItem, type CommentRow } from "./CommentItem";
import { Icon } from "@/components/ui/Icon";
import { Text } from "@/components/ui/Text";

type CommentPanelProps = {
  postId: string | null;
  visible: boolean;
  onClose: () => void;
};

export function CommentPanel({ postId, visible, onClose }: CommentPanelProps) {
  const userId = useAuthStore((s) => s.userId);
  const queryClient = useQueryClient();
  const [sortLikes, setSortLikes] = useState(false);
  const [body, setBody] = useState("");
  const slideAnim = useMemo(
    () => new Animated.Value(visible ? 1 : 0),
    []
  );

  React.useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: visible ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [visible, slideAnim]);

  const { data: comments = [] } = useQuery({
    queryKey: ["comments", postId, sortLikes, userId],
    enabled: !!postId && visible,
    queryFn: async () => {
      if (!postId) return [] as CommentRow[];
      const order = sortLikes
        ? { column: "likes_count" as const, asc: false }
        : { column: "created_at" as const, asc: false };
      const { data: rows, error } = await supabase
        .from("post_comments")
        .select("*")
        .eq("post_id", postId)
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
    enabled: !!postId && visible,
    queryFn: async () => {
      if (!postId) return 0;
      const { count, error } = await supabase
        .from("post_comments")
        .select("*", { count: "exact", head: true })
        .eq("post_id", postId);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const addMut = useMutation({
    mutationFn: async () => {
      if (!userId || !postId || !body.trim()) return;
      const { error } = await supabase.from("post_comments").insert({
        post_id: postId,
        user_id: userId,
        body: body.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setBody("");
      if (postId) {
        void queryClient.invalidateQueries({ queryKey: ["comments", postId] });
        void queryClient.invalidateQueries({ queryKey: ["post-comments-count", postId] });
        void queryClient.invalidateQueries({ queryKey: ["feed"] });
      }
    },
  });

  const title = useMemo(() => `Commentaires (${count})`, [count]);

  if (!postId) return null;

  const translateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [300, 0],
  });

  return (
    <Animated.View
      className="flex-1 bg-surface"
      style={{
        transform: [{ translateX }],
        opacity: slideAnim,
      }}
    >
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
        <Text variant="subtitle" className="text-text-primary flex-1" numberOfLines={1}>
          {title}
        </Text>
        <View className="flex-row items-center gap-3">
          <Pressable onPress={() => setSortLikes((s) => !s)}>
            <Text variant="caption" className="text-primary font-medium">
              {sortLikes ? "Tri : likes" : "Tri : date"}
            </Text>
          </Pressable>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Fermer">
            <Icon name="X" size={24} color="text-secondary" />
          </Pressable>
        </View>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <View className="flex-1">
          {comments.length === 0 ? (
            <View className="flex-1 items-center justify-center px-8 py-16">
            <Icon name="MessageSquare" size={32} color="text-tertiary" />
              <Text variant="body" className="text-text-secondary text-center mt-4">
                Aucun commentaire pour le moment.
              </Text>
              <Text variant="caption" className="text-text-tertiary text-center mt-2">
                Sois le premier à commenter !
              </Text>
            </View>
          ) : (
            <View className="flex-1">
              {comments.map((comment) => (
                <CommentItem key={comment.id} comment={comment} />
              ))}
            </View>
          )}
        </View>

        <View className="flex-row items-end gap-2 px-4 py-3 border-t border-border bg-surface dark:bg-surface-dark">
          <TextInput
            className="flex-1 border-2 border-border rounded-xl px-3 py-2 text-base text-text-primary dark:text-text-primary-dark bg-bg dark:bg-bg-dark max-h-28"
            placeholder="Ton commentaire…"
            value={body}
            onChangeText={setBody}
            multiline
            placeholderTextColor="#9CA3AF"
          />
          <Pressable
            onPress={() => {
              if (body.trim()) {
                addMut.mutate();
              }
            }}
            className={`rounded-xl p-3 mb-1 ${body.trim() ? "bg-primary" : "bg-border dark:bg-border-dark"}`}
            disabled={!body.trim() || addMut.isPending}
          >
            <Icon name="Send" size={20} color={body.trim() ? "text-inverse" : "text-tertiary"} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Animated.View>
  );
}