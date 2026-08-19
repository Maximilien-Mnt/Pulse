import { PostCard } from "@/components/feed/PostCard";
import { CommentItem, type CommentRow } from "@/components/feed/CommentItem";
import { Header } from "@/components/shared/Header";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useUserPosts } from "@/hooks/useUserPosts";
import { useAuthStore } from "@/stores/authStore";
import { useProfile } from "@/hooks/useProfile";
import { useState } from "react";
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
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useQuery, useQueryClient } from "@tanstack/react-query";

type ViewMode = "grid" | "list";

const COLS = 3;
const GAP = 8;
const SIZE =
  (Dimensions.get("window").width - 32 - GAP * (COLS - 1)) / COLS;

export default function UserPostsScreen() {
  const router = useRouter();
  const userId = useAuthStore((s) => s.userId);
  const { data: profile } = useProfile(userId);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

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

  const renderGridItem = ({ item }: { item: any }) => {
    return (
      <View style={{ width: SIZE, height: SIZE }}>
        <PostCard post={item} onCommentPress={() => handlePostPress(item.id)} />
      </View>
    );
  };

  const renderListItem = ({ item }: { item: any }) => (
    <View className="px-4 py-2">
      <PostCard post={item} onCommentPress={() => handlePostPress(item.id)} />
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
      <Header
        title="Mes posts"
        showBackButton
        showAvatar
        avatarUrl={profile?.avatar_url}
        rightSlot={
          <Pressable onPress={() => setViewMode(viewMode === "grid" ? "list" : "grid")}>
            <Ionicons
              name={viewMode === "grid" ? "list" : "grid"}
              size={24}
              color="#1E6BFF"
            />
          </Pressable>
        }
      />

      {posts.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <EmptyState
            icon="images-outline"
            title="Aucun post"
            subtitle=" Vos posts apparaîtront ici."
          />
        </View>
      ) : viewMode === "grid" ? (
        <FlatList
          data={posts}
          numColumns={COLS}
          scrollEnabled={false}
          keyExtractor={(item) => item.id}
          columnWrapperStyle={{ gap: GAP }}
          contentContainerStyle={{ gap: GAP, paddingHorizontal: 16, paddingTop: 16 }}
          renderItem={renderGridItem}
        />
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={renderListItem}
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      )}

      {/* Centered Modal for Comments */}
      <Modal
        visible={!!selectedPostId}
        transparent
        animationType="fade"
        onRequestClose={handleCloseModal}
      >
        <Pressable
          className="flex-1 bg-black/60 items-center justify-center"
          onPress={handleCloseModal}
        >
          <Pressable
            className="bg-white dark:bg-neutral-900 rounded-2xl overflow-hidden"
            style={{ width: Dimensions.get("window").width * 0.9, maxHeight: Dimensions.get("window").height * 0.8 }}
            onPress={() => {}}
          >
            <View className="flex-row items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-700">
              <Text className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
                Commentaires
              </Text>
              <Pressable onPress={handleCloseModal}>
                <Ionicons name="close" size={28} color="#64748B" />
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
  const queryClient = useQueryClient();
  const [body, setBody] = useState("");
  const [sortLikes, setSortLikes] = useState(false);

  const { data: comments = [] } = useQuery({
    queryKey: ["user-posts-comments", postId, sortLikes, currentUserId],
    enabled: !!postId,
    queryFn: async () => {
      if (!postId) return [];
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

  const handleAddComment = async () => {
    if (!currentUserId || !postId || !body.trim()) return;
    const { error } = await supabase.from("post_comments").insert({
      post_id: postId,
      user_id: currentUserId,
      body: body.trim(),
    });

    if (error) {
      console.error("Error adding comment:", error);
      return;
    }

    setBody("");
    await queryClient.invalidateQueries({ queryKey: ["user-posts-comments", postId] });
    await queryClient.invalidateQueries({ queryKey: ["user-posts-with-author"] });
  };

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <View className="flex-1">
        {comments.length === 0 ? (
          <View className="flex-1 items-center justify-center px-8 py-12">
            <Ionicons name="chatbubble-outline" size={40} color="#9CA3AF" />
            <Text className="text-neutral-500 text-center mt-4">
              Aucun commentaire pour le moment.
            </Text>
            <Text className="text-neutral-400 text-center mt-2 text-sm">
              Sois le premier à commenter !
            </Text>
          </View>
        ) : (
          <FlatList
            data={comments}
            keyExtractor={(c) => c.id}
            renderItem={({ item }) => <CommentItem comment={item} />}
            contentContainerClassName="px-4 py-2"
            style={{ maxHeight: Dimensions.get("window").height * 0.5 }}
          />
        )}
      </View>

      <View className="flex-row items-end gap-2 px-4 py-3 border-t border-neutral-200 dark:border-neutral-700">
        <TextInput
          className="flex-1 border-2 border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-base text-neutral-900 dark:text-neutral-50 bg-neutral-50 dark:bg-neutral-800 max-h-28"
          placeholder="Ton commentaire…"
          value={body}
          onChangeText={setBody}
          multiline
          placeholderTextColor="#9CA3AF"
        />
        <Pressable
          onPress={handleAddComment}
          className={`rounded-xl p-3 mb-1 ${body.trim() ? "bg-primary" : "bg-neutral-300 dark:bg-neutral-700"}`}
          disabled={!body.trim()}
        >
          <Ionicons name="send" size={20} color={body.trim() ? "#fff" : "#9CA3AF"} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}