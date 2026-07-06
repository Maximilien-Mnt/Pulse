import { Avatar } from "@/components/ui/Avatar";
import { Tag } from "@/components/ui/Tag";
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/queryClient";
import { formatRelative } from "@/utils/date";
import type { FeedPost } from "@/types";
import { useAuthStore } from "@/stores/authStore";
import { useFeedStore } from "@/stores/feedStore";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  Share,
  Text,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from "react-native-reanimated";
import { PostMedia } from "./PostMedia";

type Props = { post: FeedPost };

export function PostCard({ post }: Props) {
  const router = useRouter();
  const userId = useAuthStore((s) => s.userId);
  const setActiveTag = useFeedStore((s) => s.setActiveTag);
  const [expanded, setExpanded] = useState(false);
  const heartScale = useSharedValue(1);
  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
  }));

  const liked = !!post.liked_by_me;

  const likeMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("auth");
      if (liked) {
        const { error } = await supabase
          .from("post_likes")
          .delete()
          .eq("post_id", post.id)
          .eq("user_id", userId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("post_likes").insert({ post_id: post.id, user_id: userId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
    onError: () => {
      Toast.show({ type: "error", text1: "Impossible de mettre à jour le like" });
    },
  });

  const shareMutation = useMutation({
    mutationFn: async () => {
      const msg = `${post.title}\n\n${post.body ?? ""}`.slice(0, 4000);
      await Share.share({ message: msg, title: post.title });
      if (userId) {
        await supabase.from("feed_interactions").insert({
          user_id: userId,
          post_id: post.id,
          action: "share",
        });
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });

  const reportMutation = useMutation({
    mutationFn: async (msg: string | null) => {
      if (!userId) throw new Error("auth");
      const { error } = await supabase.from("reports").insert({
        reporter_id: userId,
        target_type: "post",
        target_id: post.id,
        message: msg,
      });
      if (error) throw error;
    },
    onSuccess: () => Toast.show({ type: "success", text1: "Signalement envoyé" }),
    onError: () => Toast.show({ type: "error", text1: "Échec du signalement" }),
  });

  const tags = useMemo(() => post.tags ?? [], [post.tags]);

  const onAuthorPress = () => {
    Toast.show({ type: "info", text1: "Fonctionnalité bientôt disponible" });
  };

  const toggleLike = () => {
    heartScale.value = withSequence(withTiming(1.2, { duration: 120 }), withTiming(1, { duration: 120 }));
    likeMutation.mutate();
  };

  return (
    <View className="px-4 py-3 border-b border-neutral-100 dark:border-neutral-800">
      <Pressable onPress={onAuthorPress} className="flex-row items-center gap-3">
        <Avatar uri={post.author.avatar_url} size={40} />
        <View className="flex-1">
          <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
            {post.author.full_name}
          </Text>
          <Text className="text-sm text-neutral-500">@{post.author.username}</Text>
        </View>
        <Text className="text-xs text-neutral-400">{formatRelative(post.created_at)}</Text>
      </Pressable>

      <Text className="text-lg font-semibold text-neutral-900 dark:text-neutral-50 mt-2">{post.title}</Text>
      {post.body ? (
        <View>
          <Text
            className="text-base text-neutral-800 dark:text-neutral-100 mt-1"
            numberOfLines={expanded ? undefined : 3}
          >
            {post.body}
          </Text>
          {post.body.length > 120 ? (
            <Pressable onPress={() => setExpanded((e) => !e)} className="mt-1">
              <Text className="text-primary font-semibold text-sm">{expanded ? "Réduire" : "... Voir plus"}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <PostMedia format={post.format} urls={post.media_urls ?? []} />

      {tags.length ? (
        <FlatList
          horizontal
          data={tags}
          keyExtractor={(t) => t}
          showsHorizontalScrollIndicator={false}
          className="mt-2"
          renderItem={({ item }) => (
            <Tag
              label={item}
              onPress={() => {
                setActiveTag(item);
                Toast.show({ type: "info", text1: `Filtre tag : ${item}` });
              }}
            />
          )}
        />
      ) : null}

      <View className="flex-row items-center mt-3 justify-between">
        <View className="flex-row items-center gap-4">
          <Pressable
            className="flex-row items-center gap-1"
            onPress={() => router.push(`/(tabs)/feed/${post.id}/comments`)}
          >
            <Ionicons name="chatbubble-outline" size={22} color="#64748B" />
            <Text className="text-sm text-neutral-600 dark:text-neutral-300">{post.comments_count}</Text>
          </Pressable>
          <Pressable className="flex-row items-center gap-1" onPress={toggleLike} disabled={!userId}>
            <Animated.View style={heartStyle}>
              <Ionicons name={liked ? "heart" : "heart-outline"} size={24} color={liked ? "#EF4444" : "#64748B"} />
            </Animated.View>
            <Text className="text-sm text-neutral-600 dark:text-neutral-300">{post.likes_count}</Text>
          </Pressable>
          <Pressable className="flex-row items-center gap-1" onPress={() => shareMutation.mutate()}>
            <Ionicons name="share-social-outline" size={22} color="#64748B" />
            <Text className="text-sm text-neutral-600 dark:text-neutral-300">{post.shares_count}</Text>
          </Pressable>
        </View>
        <Pressable
          hitSlop={8}
          onPress={() => {
            Alert.alert("Signaler ce contenu ?", "Tu peux préciser un message (optionnel).", [
              { text: "Annuler", style: "cancel" },
              {
                text: "Signaler",
                style: "destructive",
                onPress: () => reportMutation.mutate(null),
              },
            ]);
          }}
        >
          <Ionicons name="flag-outline" size={18} color="#94A3B8" />
        </Pressable>
      </View>
    </View>
  );
}
