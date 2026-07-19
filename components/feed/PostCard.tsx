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
  Modal,
  Pressable,
  Share,
  Text,
  TextInput,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from "react-native-reanimated";
import { PostMedia } from "./PostMedia";


type Props = { post: FeedPost; isActive?: boolean };


export function PostCard({ post, isActive = true }: Props) {

  const router = useRouter();
  const userId = useAuthStore((s) => s.userId);
  const setActiveTag = useFeedStore((s) => s.setActiveTag);
  const [expanded, setExpanded] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportMsg, setReportMsg] = useState("");
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
    onSuccess: () => {
      setReportOpen(false);
      setReportMsg("");
      Toast.show({ type: "success", text1: "Signalement envoyé" });
    },
    onError: () => Toast.show({ type: "error", text1: "Échec du signalement" }),
  });


  const tags = useMemo(() => post.tags ?? [], [post.tags]);


  const onAuthorPress = () => {
    router.push(`/profile/${post.author.id}`);
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


      <PostMedia 
        format={post.format} 
        urls={post.media_urls ?? []} 
        videoUrl={(post as any).video_url}
        videoThumbnail={(post as any).video_thumbnail}
        videoDuration={(post as any).video_duration}
        isActive={isActive}
      />



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
                // Show a brief toast to confirm the filter action
                Toast.show({ type: "info", text1: `Filtre : ${item}`, visibilityTime: 1000 });
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
          onPress={() => setReportOpen(true)}
        >
          <Ionicons name="flag-outline" size={18} color="#94A3B8" />
        </Pressable>
      </View>


      <Modal visible={reportOpen} transparent animationType="fade" onRequestClose={() => setReportOpen(false)}>
        <View className="flex-1 bg-black/40 justify-center px-4">
          <View className="bg-white dark:bg-neutral-900 rounded-2xl p-4">
            <Text className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">Signaler ce contenu</Text>
            <Text className="text-sm text-neutral-500 mt-1">Tu peux ajouter un message optionnel.</Text>
            <TextInput
              className="mt-3 border-2 border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-base text-neutral-900 dark:text-neutral-50 min-h-24"
              placeholder="Décris le problème (optionnel)"
              placeholderTextColor="#94A3B8"
              multiline
              value={reportMsg}
              onChangeText={setReportMsg}
            />
            <View className="flex-row gap-2 mt-4">
              <Pressable
                className="flex-1 py-3 rounded-xl bg-neutral-200 dark:bg-neutral-800 items-center"
                onPress={() => {
                  setReportOpen(false);
                  setReportMsg("");
                }}
              >
                <Text className="font-semibold text-neutral-800 dark:text-neutral-100">Annuler</Text>
              </Pressable>
              <Pressable
                className="flex-1 py-3 rounded-xl bg-red-500 items-center"
                onPress={() => {
                  reportMutation.mutate(reportMsg.trim() ? reportMsg.trim() : null);
                }}
              >
                <Text className="font-semibold text-white">Signaler</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}