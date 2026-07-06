import { Avatar } from "@/components/ui/Avatar";
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/queryClient";
import { formatRelative } from "@/utils/date";
import { useAuthStore } from "@/stores/authStore";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import { Pressable, Text, View } from "react-native";
import Toast from "react-native-toast-message";

export type CommentRow = {
  id: string;
  post_id: string;
  user_id: string;
  body: string;
  likes_count: number;
  created_at: string;
  profiles: {
    id: string;
    full_name: string;
    username: string;
    avatar_url: string | null;
  } | null;
  liked_by_me?: boolean;
};

type Props = { comment: CommentRow };

export function CommentItem({ comment }: Props) {
  const userId = useAuthStore((s) => s.userId);
  const liked = !!comment.liked_by_me;
  const author = comment.profiles;

  const likeMut = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("auth");
      if (liked) {
        const { error } = await supabase
          .from("comment_likes")
          .delete()
          .eq("comment_id", comment.id)
          .eq("user_id", userId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("comment_likes").insert({
          comment_id: comment.id,
          user_id: userId,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["comments", comment.post_id] });
    },
    onError: () => Toast.show({ type: "error", text1: "Erreur like commentaire" }),
  });

  return (
    <View className="flex-row gap-3 py-3 border-b border-neutral-100 dark:border-neutral-800">
      <Avatar uri={author?.avatar_url} size={32} />
      <View className="flex-1">
        <View className="flex-row justify-between">
          <Text className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
            {author?.full_name ?? "Utilisateur"}
          </Text>
          <Text className="text-xs text-neutral-400">{formatRelative(comment.created_at)}</Text>
        </View>
        <Text className="text-base text-neutral-800 dark:text-neutral-100 mt-1">{comment.body}</Text>
        <Pressable className="flex-row items-center gap-1 mt-2" onPress={() => likeMut.mutate()} disabled={!userId}>
          <Ionicons name={liked ? "heart" : "heart-outline"} size={18} color={liked ? "#EF4444" : "#94A3B8"} />
          <Text className="text-xs text-neutral-500">{comment.likes_count}</Text>
        </Pressable>
      </View>
    </View>
  );
}
