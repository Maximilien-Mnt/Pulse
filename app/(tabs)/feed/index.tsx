import { Header } from "@/components/shared/Header";
import { PostCard } from "@/components/feed/PostCard";
import { TagFilterBanner } from "@/components/feed/TagFilterBanner";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuthStore } from "@/stores/authStore";
import { useFeed } from "@/hooks/useFeed";
import { useFeedStore } from "@/stores/feedStore";
import { useProfile } from "@/hooks/useProfile";
import { useSearchHistory } from "@/hooks/useSearchHistory";
import {
  SearchPanel,
  applySearch,
  DEFAULT_SEARCH_OPTIONS,
  type SearchOptions,
} from "@/components/feed/SearchPanel";
import type { FeedPost } from "@/types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RefreshControl, View, type ViewToken } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { SafeAreaView } from "react-native-safe-area-context";
import { usePostHog } from "posthog-react-native";



export default function FeedScreen() {
  const userId = useAuthStore((s) => s.userId);
  const activeTag = useFeedStore((s) => s.activeTag);
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isRefetching,
  } = useFeed(activeTag);
  const { data: profile } = useProfile(userId);
  const posthog = usePostHog();
  const { history, addSearch, removeSearch, clearHistory } = useSearchHistory();
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [searchOptions, setSearchOptions] = useState<SearchOptions>(DEFAULT_SEARCH_OPTIONS);
  const [activePostId, setActivePostId] = useState<string | null>(null);

  // Debounce the query (500ms) and record it in history + analytics.
  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedQ(q);
      const trimmed = q.trim();
      if (trimmed.length >= 2) {
        addSearch(trimmed);
        posthog.capture("search_performed", {
          query_length: trimmed.length,
          scopes: searchOptions.scopes,
          sort: searchOptions.sort,
          formats: searchOptions.formats,
        });
      }
    }, 500);
    return () => clearTimeout(handle);
  }, [q, addSearch, posthog, searchOptions.scopes, searchOptions.sort, searchOptions.formats]);


  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const first = viewableItems.find((v) => v.isViewable);
      if (first?.item) setActivePostId((first.item as FeedPost).id);
    }
  ).current;


  const posts = useMemo((): FeedPost[] => {
    const flat = data?.pages.flatMap((page) => page.items) ?? [];
    const hasFilters =
      debouncedQ.trim().length > 0 ||
      searchOptions.formats.length > 0 ||
      searchOptions.tag.trim().length > 0;
    if (!searchOpen || !hasFilters) return flat;
    return applySearch(flat, debouncedQ, searchOptions);
  }, [data, debouncedQ, searchOptions, searchOpen]);


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
      {searchOpen ? (
        <SearchPanel
          options={searchOptions}
          onChange={setSearchOptions}
          history={history}
          onSelectHistory={(h) => setQ(h)}
          onRemoveHistory={removeSearch}
          onClearHistory={clearHistory}
        />
      ) : null}
      <FlashList

        data={posts}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => (
          <PostCard post={item} isActive={item.id === activePostId} />
        )}
        onViewableItemsChanged={onViewableItemsChanged}

        viewabilityConfig={viewabilityConfig}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} />}
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
        }}
        ListEmptyComponent={
          <EmptyState
            icon="images-outline"
            title="Aucun post"
            subtitle="Sois le premier à publier depuis l’onglet Créer."
          />
        }
        contentContainerStyle={{ paddingBottom: 24 }}
      />

    </SafeAreaView>
  );
}