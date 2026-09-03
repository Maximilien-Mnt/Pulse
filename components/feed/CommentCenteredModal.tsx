// ---------------------------------------------------------------------------
// PULSE FEED — Comment Centered Modal
// Centered window overlay for mobile/narrow screens
// ---------------------------------------------------------------------------

import React, { useMemo, useState } from "react";
import {
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import { useThemeStore } from "@/stores/themeStore";
import { supabase } from "@/lib/supabase";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CommentItem, type CommentRow } from "./CommentItem";
import { Icon } from "@/components/ui/Icon";
import { Text } from "@/components/ui/Text";
import { usePostComment } from "@/hooks/usePostComment";

type CommentCenteredModalProps = {
  postId: string | null;
  visible: boolean;
  onClose: () => void;
};

export function CommentCenteredModal({ postId, visible, onClose }: CommentCenteredModalProps) {
  const userId = useAuthStore((s) => s.userId);
  const isDark = useThemeStore((s) => s.isDark);
  const queryClient = useQueryClient();
  const [sortLikes, setSortLikes] = useState(false);
  const [body, setBody] = useState("");
  const {
    commentsCount,
    isPending,
    addComment,
    deleteComment,
    editComment,
  } = usePostComment({
    postId: postId ?? "",
    initialCommentsCount: 0,
  });
  const insets = useSafeAreaInsets();

  const fadeAnim = useMemo(
    () => new Animated.Value(visible ? 1 : 0),
    []
  );
  const scaleAnim = useMemo(
    () => new Animated.Value(visible ? 1 : 0.9),
    []
  );

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: visible ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: visible ? 1 : 0.9,
        friction: 9,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, fadeAnim, scaleAnim]);

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

  const title = useMemo(() => `Commentaires (${comments.length})`, [comments.length]);

  if (!postId || !visible) return null;

  const screenWidth = Dimensions.get("window").width;
  const screenHeight = Dimensions.get("window").height;

  const isNarrow = screenWidth < 400;
  const framePadding = isNarrow ? 6 : 32;

  // Navbar dimensions (from TabBar: 64px + safe area bottom)
  const navbarHeight = 64 + insets.bottom;
  
  // Centered modal dimensions
  const modalWidth = Math.min(screenWidth * 0.92, 650);
  const navbarBuffer = 160; // Increased buffer to ensure minimum 50px clearance
  const modalMaxHeight = screenHeight * 0.78 - navbarHeight - navbarBuffer;
  
  // Calculate modal top position to ensure it never goes under navbar
  const centeredTop = (screenHeight - modalMaxHeight) / 2;
  const maxAllowedTop = screenHeight - navbarHeight - navbarBuffer - modalMaxHeight;
  const modalTop = Math.min(centeredTop, maxAllowedTop);

  // Responsive border width based on modal size
  const borderWidth = modalWidth < 400 ? 1.5 : modalWidth < 550 ? 2 : 3;
  
  // Responsive border radius based on modal size
  const borderRadius = modalWidth < 400 ? 16 : modalWidth < 550 ? 20 : 24;
  
  // Theme-aware border color
  const borderColor = isDark ? "#262A32" : "#9CA3AF";

  return (
    <View className="absolute inset-0 z-50">
      {/* Backdrop - full screen touch target to close on outside tap */}
      <Pressable
        className="absolute inset-0 bg-text-primary/60"
        style={{ opacity: fadeAnim }}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Fermer"
        accessibilityHint="Ferme les commentaires"
      />

      {/* Modal Container - pure positioning, allows backdrop touches outside modal area */}
      <Animated.View
        className="absolute"
        pointerEvents="box-none"
        style={{
          width: modalWidth,
          height: modalMaxHeight,
          // Position modal to stay at least 50px above navbar
          top: modalTop,
          left: (screenWidth - modalWidth) / 2,
        }}
      >
        {/* Animated inner view - transform confined to modal bounds so it
            doesn't block backdrop touches outside the modal */}
        <Animated.View
          className="flex-1"
          style={{
            opacity: fadeAnim,
            transform: [
              { scale: scaleAnim },
            ],
            borderRadius,
            overflow: "hidden",
            // Enhanced shadow for depth
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.3,
            shadowRadius: 16,
            elevation: 12,
          }}
        >
         <View className="flex-1 bg-surface dark:bg-surface-dark" style={{ paddingHorizontal: framePadding }}>
           {/* Header */}
           <View className="flex-row items-center justify-between py-3 border-b border-border">
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

          {/* Comments List */}
          <KeyboardAvoidingView
            className="flex-1"
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
          >
             <ScrollView
                className="flex-1 bg-surface dark:bg-surface-dark"
                style={{ maxHeight: modalMaxHeight - 140 - framePadding * 2 }}
               keyboardShouldPersistTaps="handled"
               showsVerticalScrollIndicator={true}
             >
              {comments.length === 0 ? (
                <View className="items-center justify-center px-8 py-12">
                  <Icon name="MessageSquare" size={32} color="text-tertiary" />
                  <Text variant="body" className="text-text-secondary text-center mt-4">
                    Aucun commentaire pour le moment.
                  </Text>
                  <Text variant="caption" className="text-text-tertiary text-center mt-2">
                    Sois le premier à commenter !
                  </Text>
                </View>
              ) : (
                <View>
                  {comments.map((comment) => (
                    <CommentItem
                      key={comment.id}
                      comment={comment}
                      onDelete={deleteComment}
                      onEdit={editComment}
                    />
                  ))}
                </View>
              )}
            </ScrollView>

             {/* Input Area */}
<View className="flex-row items-end gap-2 py-3 border-t border-border">
              <TextInput
                className="flex-1 border-2 border-border rounded-xl px-3 py-2 text-base text-text-primary dark:text-text-primary-dark bg-bg dark:bg-bg-dark max-h-28"
                style={{ flex: 1 }}
                placeholder="Ton commentaire…"
                value={body}
                onChangeText={setBody}
                multiline
                placeholderTextColor="#9CA3AF"
              />
              <Pressable
                onPress={() => {
                  void addComment(body);
                }}
                className={`rounded-xl p-3 mb-1 ${body.trim() ? "bg-primary" : "bg-border dark:bg-border-dark"}`}
                disabled={!body.trim() || isPending}
              >
                <Icon name="Send" size={20} color={body.trim() ? "text-inverse" : "text-tertiary"} />
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </View>
        </Animated.View>
      </Animated.View>
    </View>
  );
}