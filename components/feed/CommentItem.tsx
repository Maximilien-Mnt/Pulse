// ---------------------------------------------------------------------------
// PULSE FEED — Comment Item
//
// Displays a single comment with:
//   - Author avatar, name, and timestamp
//   - "Modified" indicator when edited
//   - Like button
//   - Author-only `⋮` menu button for Edit / Delete (native context menu)
//   - Inline edit mode with text input + save/cancel
// ---------------------------------------------------------------------------

import { Avatar } from "@/components/ui/Avatar";
import { formatRelative } from "@/utils/date";
import { useAuthStore } from "@/stores/authStore";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  TextInput,
  View,
} from "react-native";
import { Text } from "@/components/ui/Text";
import { Icon } from "@/components/ui/Icon";
import { useCommentLike } from "@/hooks/useCommentLike";
import { CommentMenu } from "./CommentMenu";

export type CommentRow = {
  id: string;
  post_id: string;
  user_id: string;
  body: string;
  likes_count: number;
  created_at: string;
  updated_at?: string;
  profiles: {
    id: string;
    full_name: string;
    username: string;
    avatar_url: string | null;
  } | null;
  liked_by_me?: boolean;
};

type Props = {
  comment: CommentRow;
  onDelete?: (commentId: string) => Promise<void>;
  onEdit?: (commentId: string, newBody: string) => Promise<void>;
};

export function CommentItem({ comment, onDelete, onEdit }: Props) {
  const userId = useAuthStore((s) => s.userId);
  const author = comment.profiles;

  const { liked, likesCount, isPending: likePending, toggleLike } = useCommentLike({
    commentId: comment.id,
    postId: comment.post_id,
    initialLiked: !!comment.liked_by_me,
    initialLikesCount: comment.likes_count,
  });

  const [localDeleting, setLocalDeleting] = useState(false);
  const [localEditing, setLocalEditing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [anchorMetrics, setAnchorMetrics] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [editText, setEditText] = useState(comment.body);
  const [editSaving, setEditSaving] = useState(false);

  const deleting = likePending || localDeleting;
  const moreButtonRef = useRef<View>(null);

  const editFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (localEditing) {
      // Only seed the text when entering edit mode, not on every body change.
      setEditText(comment.body);
      Animated.timing(editFade, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      editFade.setValue(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localEditing, editFade]);

  const canModify = !!userId && userId === comment.user_id;

  const handleDelete = useCallback(async () => {
    if (!onDelete) return;
    setLocalDeleting(true);
    try {
      await onDelete(comment.id);
    } finally {
      setLocalDeleting(false);
    }
  }, [comment.id, onDelete]);

  const handleEditSave = useCallback(async () => {
    if (!onEdit || !editText.trim()) return;
    setEditSaving(true);
    try {
      await onEdit(comment.id, editText.trim());
    } finally {
      setEditSaving(false);
      setLocalEditing(false);
    }
  }, [comment.id, editText, onEdit]);

  const handleEditCancel = useCallback(() => {
    setLocalEditing(false);
    setEditText(comment.body);
  }, [comment.body]);

  const openMenu = useCallback(() => {
    if (!canModify || !moreButtonRef.current) return;

    moreButtonRef.current.measureInWindow((x, y, width, height) => {
      setAnchorMetrics({ x, y, width, height });
      setMenuVisible(true);
    });
  }, [canModify]);

  return (
    <>
      <View className="flex-row gap-3 py-3 border-b border-neutral-100 dark:border-neutral-800">
        <Avatar uri={author?.avatar_url} size={32} />
        <View className="flex-1">
          <View className="flex-row justify-between items-start">
            <View className="flex-1">
              <Text className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                {author?.full_name ?? "Utilisateur"}
              </Text>
              <View className="flex-row items-center gap-1">
                <Text className="text-xs text-neutral-400">
                  {formatRelative(comment.created_at)}
                </Text>
                {comment.updated_at && comment.updated_at !== comment.created_at && (
                  <Text className="text-xs text-neutral-400 italic">
                    {" · modifié"}
                  </Text>
                )}
              </View>
            </View>
            {canModify && (
              <View ref={moreButtonRef} collapsable={false}>
                <Pressable
                  onPress={openMenu}
                  accessibilityRole="button"
                  accessibilityLabel="Options du commentaire"
                  hitSlop={8}
                  className="p-1.5 -mr-1.5 rounded-full active:bg-neutral-100 dark:active:bg-neutral-800"
                >
                  <Icon name="MoreVertical" size={18} color="text-tertiary" />
                </Pressable>
              </View>
            )}
          </View>

          {localEditing ? (
            <Animated.View style={{ opacity: editFade }} className="mt-2">
              <TextInput
                className="border-2 border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-base text-neutral-900 dark:text-neutral-50 bg-neutral-50 dark:bg-neutral-800 max-h-32"
                value={editText}
                onChangeText={setEditText}
                multiline
                autoFocus
                placeholderTextColor="#9CA3AF"
              />
              <View className="flex-row justify-end gap-2 mt-2">
                <Pressable
                  onPress={handleEditCancel}
                  disabled={editSaving}
                  className="px-4 py-2 rounded-lg active:opacity-70"
                  accessibilityRole="button"
                  accessibilityLabel="Annuler"
                >
                  <Text className="text-sm font-medium text-neutral-500">
                    Annuler
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handleEditSave}
                  disabled={!editText.trim() || editSaving}
                  className={`px-4 py-2 rounded-lg ${editText.trim() ? "bg-primary" : "bg-neutral-200 dark:bg-neutral-700"}`}
                  accessibilityRole="button"
                  accessibilityLabel="Enregistrer"
                >
                  <Text
                    className={`text-sm font-medium ${editText.trim() ? "text-white" : "text-neutral-400"}`}
                  >
                    {editSaving ? "..." : "Enregistrer"}
                  </Text>
                </Pressable>
              </View>
            </Animated.View>
          ) : (
            <Text className="text-base text-neutral-800 dark:text-neutral-100 mt-1.5">
              {comment.body}
            </Text>
          )}

          {!localEditing && (
            <Pressable
              className="flex-row items-center gap-1 mt-2"
              onPress={toggleLike}
              disabled={!userId || likePending}
            >
              <Icon
                name="Heart"
                size={16}
                color={liked ? "error-500" : "text-tertiary"}
                filled={liked}
              />
              <Text className="text-xs text-neutral-500">{likesCount}</Text>
            </Pressable>
          )}
        </View>
      </View>

      {anchorMetrics && (
        <CommentMenu
          visible={menuVisible}
          anchorX={anchorMetrics.x}
          anchorY={anchorMetrics.y}
          anchorWidth={anchorMetrics.width}
          anchorHeight={anchorMetrics.height}
          onClose={() => setMenuVisible(false)}
          onEdit={() => {
            setMenuVisible(false);
            setTimeout(() => setLocalEditing(true), 200);
          }}
          onDelete={handleDelete}
          isDeleting={deleting}
        />
      )}
    </>
  );
}
