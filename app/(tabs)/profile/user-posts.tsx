import { PostCard } from "@/components/feed/PostCard";
import { CommentItem, type CommentRow } from "@/components/feed/CommentItem";
import { Header } from "@/components/shared/Header";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useUserPosts } from "@/hooks/useUserPosts";
import { useAuthStore } from "@/stores/authStore";
import { useProfile } from "@/hooks/useProfile";
import { usePostComment } from "@/hooks/usePostComment";
import { useState, useCallback } from "react";
import {
  FlatList,
  View,
  Text,
  Pressable,
  Modal,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  TextInput,
} from "react-native";
import { SafeScreen } from "@/components/shared/SafeScreen";
import { useRouter } from "expo-router";
import { Icon } from "@/components/ui/Icon";
import { supabase } from "@/lib/supabase";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { t } from "@/hooks/useTranslation";

export default function UserPostsScreen() {
  const router = useRouter();
  const userId = useAuthStore((s) => s.userId);
  const { data: profile } = useProfile(userId);
  const queryClient = useQueryClient();
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const {
    data: posts = [],
    isLoading,
    isError,
  } = useUserPosts(userId);

  const handlePostPress = (postId: string) => {
    setSelectedPostId(postId);
  };

  const handleCloseModal = () => {
    setSelectedPostId(null);
  };

  const handleDeletePress = useCallback((postId: string) => {
    setDeleteConfirmId(postId);
    setDeleteError(null);
  }, []);

  const handleCancelDelete = useCallback(() => {
    setDeleteConfirmId(null);
    setDeleteError(null);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteConfirmId || !userId) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const { error } = await supabase.from("posts").delete().eq("id", deleteConfirmId);
      if (error) {
        setDeleteError("Impossible de supprimer le post.");
        return;
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["user-posts-with-author", userId] }),
        queryClient.invalidateQueries({ queryKey: ["user-posts"] }),
        queryClient.invalidateQueries({ queryKey: ["feed"] }),
      ]);
      setDeleteConfirmId(null);
    } finally {
      setIsDeleting(false);
    }
  }, [deleteConfirmId, userId, queryClient]);

  const renderListItem = ({ item }: { item: any }) => (
    <View className="px-4 py-2">
      <PostCard
        post={item}
        onCommentPress={() => handlePostPress(item.id)}
        onDeletePress={() => handleDeletePress(item.id)}
      />
    </View>
  );

  if (isLoading) {
    return (
      <SafeScreen className="flex-1 bg-neutral-50 dark:bg-[#0A0F1E]" edges={["top"]}>
        <Header title="Mes posts" showBackButton showAvatar avatarUrl={profile?.avatar_url} />
        <View className="px-4 gap-3 mt-4">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </View>
      </SafeScreen>
    );
  }

  if (isError) {
    return (
      <SafeScreen className="flex-1 bg-neutral-50 dark:bg-[#0A0F1E]" edges={["top"]}>
        <Header title="Mes posts" showBackButton showAvatar avatarUrl={profile?.avatar_url} />
        <ErrorState message="Erreur de chargement" onRetry={() => {}} />
      </SafeScreen>
    );
  }

  return (
    <SafeScreen className="flex-1 bg-neutral-50 dark:bg-[#0A0F1E]" edges={["top"]}>
      <Header title="Mes posts" showBackButton showAvatar avatarUrl={profile?.avatar_url} />

      {posts.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <EmptyState icon="Images" title={t("common.noPosts")} subtitle={t("feed.empty")} />
        </View>
      ) : (
        <FlatList data={posts} keyExtractor={(item) => item.id} renderItem={renderListItem} contentContainerStyle={{ paddingBottom: 24 }} />
      )}

      {/* Delete confirmation modal */}
      <Modal visible={!!deleteConfirmId} transparent animationType="fade" onRequestClose={handleCancelDelete}>
        <Pressable className="flex-1 bg-black/60 items-center justify-center" onPress={handleCancelDelete}>
          <Pressable className="bg-white dark:bg-neutral-900 rounded-2xl p-5" style={{ width: Dimensions.get("window").width * 0.85, maxHeight: Dimensions.get("window").height * 0.35 }} onPress={() => {}}>
            <Text className="text-lg font-semibold text-neutral-900 dark:text-neutral-50 mb-2">
              Supprimer le post ?
            </Text>
            <Text className="text-neutral-600 dark:text-neutral-400 mb-5">
              Cette action est irreversible.
            </Text>

            {deleteError ? (
              <Text className="text-red-500 mb-3">{deleteError}</Text>
            ) : null}

            <View className="flex-row gap-3">
              <Pressable onPress={handleCancelDelete} className="flex-1 py-3 rounded-xl border border-neutral-300 dark:border-neutral-700" disabled={isDeleting}>
                <Text className="text-center font-semibold text-neutral-900 dark:text-neutral-50">
                  Annuler
                </Text>
              </Pressable>
              <Pressable onPress={handleConfirmDelete} className="flex-1 py-3 rounded-xl bg-red-500" disabled={isDeleting}>
                <Text className="text-center font-semibold text-white">
                  {isDeleting ? t("common.deleting") : t("common.delete")}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Centered Modal for Comments */}
      <Modal visible={!!selectedPostId} transparent animationType="fade" onRequestClose={handleCloseModal}>
        <Pressable className="flex-1 bg-black/60 items-center justify-center" onPress={handleCloseModal}>
          <Pressable className="bg-white dark:bg-neutral-900 rounded-2xl overflow-hidden" style={{ width: Dimensions.get("window").width * 0.9, maxHeight: Dimensions.get("window").height * 0.8 }} onPress={() => {}}>
            <View className="flex-row items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-700">
              <Text className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
                Commentaires
              </Text>
              <Pressable onPress={handleCloseModal}>
                <Icon name="X" size={28} color="text-secondary" />
              </Pressable>
            </View>

            {selectedPostId ? (
              <CommentsContent postId={selectedPostId} />
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeScreen>
  );
}

function CommentsContent({ postId }: { postId: string }) {
  const currentUserId = useAuthStore((s) => s.userId);
  const [body, setBody] = useState("");
  const [sortLikes, setSortLikes] = useState(false);

  const { commentsCount, addComment, deleteComment } = usePostComment({
    postId,
    initialCommentsCount: 0,
  });

  const { data: comments = [] } = useQuery({
    queryKey: ["user-posts-comments", postId, sortLikes, currentUserId],
    enabled: !!postId,
    queryFn: async () => {
      if (!postId) return [];
      const order = sortLikes ? { column: "likes_count" as const, asc: false } : { column: "created_at" as const, asc: false };
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
      if (currentUserId && rows?.length) {
        const cids = rows.map((r) => r.id);
        const { data: likes } = await supabase
          .from("comment_likes")
          .select("comment_id")
          .eq("user_id", currentUserId)
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

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <View className="flex-1">
        {comments.length === 0 ? (
          <View className="flex-1 items-center justify-center px-8 py-12">
            <Icon name="MessageSquare" size={40} color="text-tertiary" />
            <Text className="text-neutral-500 text-center mt-4">
              Aucun commentaire pour le moment.
            </Text>
            <Text className="text-neutral-400 text-center mt-2 text-sm">
              Sois le premier a commenter !
            </Text>
          </View>
        ) : (
          <FlatList
            data={comments}
            keyExtractor={(c) => c.id}
            renderItem={({ item }) => (
              <CommentItem comment={item} onDelete={deleteComment} />
            )}
            contentContainerClassName="px-4 py-2"
            style={{ maxHeight: Dimensions.get("window").height * 0.5 }}
          />
        )}
      </View>

      <View className="flex-row items-end gap-2 px-4 py-3 border-t border-neutral-200 dark:border-neutral-700">
        <TextInput
          className="flex-1 border-2 border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-base text-neutral-900 dark:text-neutral-50 bg-neutral-50 dark:bg-neutral-800 max-h-28"
          placeholder="Ton commentaire..."
          value={body}
          onChangeText={setBody}
          multiline
          placeholderTextColor="#9CA3AF"
        />
        <Pressable
          onPress={async () => {
            await addComment(body);
            setBody("");
          }}
          className={`${"rounded-xl p-3"} ${body.trim() ? "bg-primary" : "bg-neutral-300 dark:bg-neutral-700"}`}
          disabled={!body.trim()}
        >
          <Icon name="Send" size={20} color={body.trim() ? "white" : "text-tertiary"} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
