// ---------------------------------------------------------------------------
// PULSE FEED — Post Card
//
// Uses Card (prompt 3), Text (prompt 2), Icon (prompt 4), Tag (prompt 3),
// and Avatar components from the design system.
// ---------------------------------------------------------------------------

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  Share,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import type { FeedPost } from "@/types";
import { useAuthStore } from "@/stores/authStore";
import { formatRelative } from "@/utils/date";
import { normalizeTag } from "@/utils/format";
import { SPORTS } from "@/lib/constants";

import { Card } from "@/components/ui/Card";
import { Text } from "@/components/ui/Text";
import { Icon } from "@/components/ui/Icon";
import { Tag } from "@/components/ui/Tag";
import { Avatar } from "@/components/ui/Avatar";
import { PostMedia } from "./PostMedia";
import { ReportSheet } from "@/components/shared/ReportSheet";
import { usePostLike } from "@/hooks/usePostLike";
import { LikeButton } from "./LikeButton";
import { CommentButton } from "./CommentButton";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

// Max lines the bottom tag text can occupy before collapsing (truncated)
const MAX_TAGS_LINES = 3;

interface PostCardProps {
  post: FeedPost;
  onCommentPress?: () => void;
  onDeletePress?: () => void;
  onLayout?: (event: { nativeEvent: { layout: { height: number } } }) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PostCard({ post, onCommentPress, onDeletePress, onLayout }: PostCardProps) {
  const router = useRouter();
  
  // Centralized like management — optimistic UI, server-exact counts.
  const { liked, likesCount, isPending, toggleLike } = usePostLike({
    postId: post.id,
    initialLiked: (post as any).liked_by_me ?? false,
    initialLikesCount: post.likes_count ?? 0,
  });
  
  // Only local state is UI-related
  const [expanded, setExpanded] = useState(false);
  const [reportSheetVisible, setReportSheetVisible] = useState(false);
  const [tagsExpanded, setTagsExpanded] = useState(false);
  const [tagsContentLineCount, setTagsContentLineCount] = useState(0);

  const bodyTruncated = useMemo(() => {
    if (!post.body) return false;
    const lines = post.body.split("\n");
    if (lines.length > 4) return true;
    return post.body.length > 280;
  }, [post.body]);

  // Reset tag expansion state when the card is recycled for a new post
  useEffect(() => {
    setTagsExpanded(false);
    setTagsContentLineCount(0);
  }, [post.id]);

  const handleLike = useCallback(() => {
    toggleLike();
  }, [toggleLike]);

  const handleComment = useCallback(() => {
    if (onCommentPress) {
      onCommentPress();
    } else {
      router.push(`/(tabs)/feed/${post.id}/comments` as any);
    }
  }, [router, post.id, onCommentPress]);

  const handleShare = useCallback(() => {
    void Share.share({ message: post.title ?? post.body ?? "Post Pulse" });
  }, [post.title, post.body]);

  const handleAuthorPress = useCallback(() => {
    if (post.author?.id) {
      router.push(`/profile/${post.author.id}` as any);
    }
  }, [router, post.author?.id]);

  const authorName = post.author?.full_name ?? post.author?.username ?? "Utilisateur";
  const avatarUrl = post.author?.avatar_url ?? undefined;
  const allTags = post.tags ?? [];
  const sportTag = allTags.length > 0 ? allTags[0] : null;
  const isSportTag = sportTag != null && SPORTS.some((s) => s.id === sportTag);
  const sportValue = isSportTag ? sportTag : null;
  const sportLabel = sportValue
    ? SPORTS.find((s) => s.id === sportValue)?.label ?? sportValue
    : null;
  // Hashtags = everything in tags except the sport (kept up top)
  const hashtagTags = useMemo(
    () => allTags.filter((t) => (sportValue ? t !== sportValue : true)),
    [allTags, sportValue]
  );
  const hashtagText = useMemo(
    () => hashtagTags.map((t) => normalizeTag(t)).join(" "),
    [hashtagTags]
  );
  const hasTags = hashtagText.length > 0;
  const tagsOverflow = tagsContentLineCount > MAX_TAGS_LINES;

  return (
    <View onLayout={onLayout}>
      <Card className="mb-3 p-0">
        <View className="p-4">
        {/* Header */}
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={handleAuthorPress}
            accessibilityRole="button"
            accessibilityLabel={`Voir le profil de ${authorName}`}
          >
            <Avatar size={40} uri={avatarUrl} />
          </Pressable>
          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <Pressable
                onPress={handleAuthorPress}
                accessibilityRole="button"
                accessibilityLabel={`Voir le profil de ${authorName}`}
              >
                <Text variant="subtitle" className="text-text-primary">
                  {authorName}
                </Text>
              </Pressable>
              {sportLabel ? (
                <Tag variant="chip" active={false}>
                  {sportLabel}
                </Tag>
              ) : null}
            </View>
            <View className="flex-row items-center gap-2 mt-0.5">
              <Text variant="caption" className="text-text-tertiary">
                {formatRelative(post.created_at)}
              </Text>
              {(post.author as any)?.city ? (
                <Text variant="caption" className="text-text-tertiary">
                  · {(post.author as any).city}
                </Text>
              ) : null}
            </View>
          </View>
        </View>

        {/* Title */}
        {post.title ? (
          <Text variant="h2" className="text-text-primary mt-3">
            {post.title}
          </Text>
        ) : null}

        {/* Body */}
        {post.body ? (
          <View className="mt-2">
            <Text
              variant="body"
              className="text-text-secondary"
              numberOfLines={expanded || !bodyTruncated ? undefined : 4}
            >
              {post.body}
            </Text>
            {bodyTruncated && !expanded ? (
              <Pressable onPress={() => setExpanded(true)} className="mt-1">
                <Text variant="caption" className="text-primary">
                  Voir plus
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {/* Media */}
        {post.media_urls && post.media_urls.length > 0 ? (
          <View className="mt-3 -mx-4">
            <PostMedia
              urls={post.media_urls}
              format={post.format}
              videoUrl={post.video_url ?? undefined}
              videoThumbnail={post.video_thumbnail ?? undefined}
            />
          </View>
        ) : null}

        {/* Tags — bottom of the post content, above the actions bar.
            Rendered as inline text (with visible #) so hashtags stay readable. */}
        {hasTags ? (
          <View className="mt-3 relative">
            {/* Invisible measurer — full unclamped text so we can detect overflow */}
            <View className="absolute top-0 left-0 right-0 opacity-0" pointerEvents="none">
              <Text
                variant="body"
                className="text-text-tertiary"
                onTextLayout={(e) => setTagsContentLineCount(e.nativeEvent.lines.length)}
              >
                {hashtagText}
              </Text>
            </View>

            {/* Visible — clamped to ~3 lines until expanded */}
            <Text
              variant="body"
              className="text-text-tertiary"
              numberOfLines={tagsExpanded ? undefined : MAX_TAGS_LINES}
            >
              {hashtagText}
            </Text>

            {!tagsExpanded && tagsOverflow ? (
              <Pressable onPress={() => setTagsExpanded(true)} className="mt-1">
                <Text variant="caption" className="text-primary">
                  Voir plus
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>

      {/* Actions bar */}
      <View className="flex-row items-center justify-around px-4 py-3 border-t border-border">
        {/* Like */}
        <LikeButton
          liked={liked}
          likesCount={likesCount}
          isPending={isPending}
          onPress={handleLike}
        />

        {/* Comment */}
        <Pressable
          onPress={handleComment}
          accessibilityRole="button"
          accessibilityLabel="Commenter"
          className="flex-row items-center gap-1.5"
        >
          <Icon name="MessageSquare" size={20} color="text-tertiary" />
          <Text variant="caption" className="text-text-tertiary tabular-nums">
            {post.comments_count ?? 0}
          </Text>
        </Pressable>

        {/* Share */}
        <Pressable
          onPress={handleShare}
          accessibilityRole="button"
          accessibilityLabel="Partager"
          className="flex-row items-center gap-1.5"
        >
          <Icon name="Share2" size={20} color="text-tertiary" />
        </Pressable>

        {/* Report */}
        <Pressable
          onPress={() => setReportSheetVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Signaler"
          className="flex-row items-center gap-1.5"
        >
          <Icon name="Flag" size={20} color="text-tertiary" />
        </Pressable>

        {/* Delete */}
        {onDeletePress ? (
          <Pressable
            onPress={() => {
              console.log("Delete pressed in PostCard");
              onDeletePress();
            }}
            accessibilityRole="button"
            accessibilityLabel="Supprimer"
            className="flex-row items-center justify-center w-12 h-12 rounded-lg bg-primary/10"
            hitSlop={8}
          >
            <Icon name="Trash2" size={20} color="error-500" />
          </Pressable>
        ) : null}
      </View>

      {/* Report sheet (shared with the public profile screen) */}
      <ReportSheet
        visible={reportSheetVisible}
        onClose={() => setReportSheetVisible(false)}
        targetType="post"
        targetId={post.id}
        targetAuthorId={post.author?.id}
        targetLabel={post.title ?? post.body?.slice(0, 50)}
      />
    </Card>
  </View>
  );
}