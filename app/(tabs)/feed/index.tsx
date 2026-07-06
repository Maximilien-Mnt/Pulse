import { Header } from "@/components/shared/Header";
import { PostCard } from "@/components/feed/PostCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuthStore } from "@/stores/authStore";
import { useFeed } from "@/hooks/useFeed";
import { useProfile } from "@/hooks/useProfile";
import type { FeedPost } from "@/types";
import { useCallback, useMemo, useState } from "react";
import { FlatList, RefreshControl, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function FeedScreen() {
  const userId = useAuthStore((s) => s.userId);
  const { data, isLoading, isError, error, refetch, fetchNextPage, hasNextPage, isFetchingNextPage, isRefetching } = useFeed();
  const { data: profile } = useProfile(userId);
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState("");

  const posts = useMemo((): FeedPost[] => {
    const flat = (data?.pages.flat() ?? []) as FeedPost[];
    if (!q.trim()) return flat;
    const t = q.toLowerCase();
    return flat.filter((p) => p.title.toLowerCase().includes(t) || (p.body ?? "").toLowerCase().includes(t));
  }, [data, q]);

  const onRefresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  if (isLoading && !data) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-[#0A0F1E]">
        <Header title="Pulse" showAvatar avatarUrl={profile?.avatar_url} />
        <View className="px-4 pt-2 gap-3">
          <Skeleton height={120} className="w-full" />
          <Skeleton height={120} className="w-full" />
          <Skeleton height={120} className="w-full" />
        </View>
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-[#0A0F1E]">
        <ErrorState message={error?.message ?? "Erreur"} onRetry={() => void refetch()} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-[#0A0F1E]" edges={["top"]}>
      <Header
        title="Pulse"
        showAvatar
        avatarUrl={profile?.avatar_url}
        searchValue={q}
        onSearchChange={setQ}
        searchExpanded={searchOpen}
        onSearchPress={() => setSearchOpen(true)}
      />
      <FlatList
        data={posts}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => <PostCard post={item} />}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} />}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
        }}
        ListEmptyComponent={
          <EmptyState icon="images-outline" title="Aucun post" subtitle="Sois le premier à publier depuis l’onglet Créer." />
        }
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </SafeAreaView>
  );
}
