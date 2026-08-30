import { Avatar } from "@/components/ui/Avatar";
import { formatRelative } from "@/utils/date";
import { useAuthStore } from "@/stores/authStore";
import { Pressable, Text, View } from "react-native";
import { Icon } from "@/components/ui/Icon";
import { useCommentLike } from "@/hooks/useCommentLike";

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
  const author = comment.profiles;

  const { liked, likesCount, isPending, toggleLike } = useCommentLike({
    commentId: comment.id,
    postId: comment.post_id,
    initialLiked: !!comment.liked_by_me,
    initialLikesCount: comment.likes_count,
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
        <Pressable
          className="flex-row items-center gap-1 mt-2"
          onPress={toggleLike}
          disabled={!userId || isPending}
        >
          <Icon
            name="Heart"
            size={18}
            color={liked ? "error-500" : "text-tertiary"}
            filled={liked}
          />
          <Text className="text-xs text-neutral-500">{likesCount}</Text>
        </Pressable>
      </View>
    </View>
  );
}
