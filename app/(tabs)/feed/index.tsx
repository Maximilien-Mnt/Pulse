// ---------------------------------------------------------------------------
// PULSE FEED SCREEN
//
// Top bar: Pulse logo + plain search bar + Filter / Sort / View-toggle buttons
// Filter panel: inline FeedFilterPanel (Format + Tag spécifique)
// Sort panel: inline FeedSortPanel (Pertinence / Date / Likes / …)
// Filter row: sticky chips (Pour toi, Abonnements, sports) — filter the feed
// Post list: PostCard components with skeleton/empty/error states
// ---------------------------------------------------------------------------

import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  FlatList,
  RefreshControl,
  View,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/stores/authStore";
import { useFeedStore } from "@/stores/feedStore";
import { useFeed } from "@/hooks/useFeed";
import { useNotifications } from "@/hooks/useNotifications";
import { useUserSports } from "@/hooks/useUserSports";
import { useSearchHistory } from "@/hooks/useSearchHistory";
import { useFeedTagSuggestions } from "@/hooks/useFeedTagSuggestions";
import {
  applySearch,
  DEFAULT_SEARCH_OPTIONS,
  type SearchOptions,
  type SearchSort,
} from "@/components/feed/SearchPanel";
import { FeedFilterPanel } from "@/components/feed/FeedFilterPanel";
import { FeedSortPanel } from "@/components/feed/FeedSortPanel";
import type { FeedPost } from "@/types";

import { Text } from "@/components/ui/Text";
import { Icon } from "@/components/ui/Icon";
import { Tag } from "@/components/ui/Tag";
import { PressableScale, CHIP_SCALE_HOVER, CHIP_SCALE_PRESS } from "@/components/ui/PressableScale";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { PostCard } from "@/components/feed/PostCard";
import { FeedGrid } from "@/components/feed/FeedGrid";
import { CommentPanel } from "@/components/feed/CommentPanel";
import { CommentCenteredModal } from "@/components/feed/CommentCenteredModal";
import { FeedFilterSortBar } from "@/components/feed/FeedFilterSortBar";
import { SafeScreen } from "@/components/shared/SafeScreen";
import { useTranslation , t } from "@/hooks/useTranslation";

// ---------------------------------------------------------------------------
// Skeleton placeholder
// ---------------------------------------------------------------------------

function FeedSkeleton() {
  return (
    <View
      className="px-4 pt-4 gap-4"
      testID="feed-skeleton"
      accessibilityLabel={t("common.loading")}
      importantForAccessibility="no-hide-descendants"
    >
      {[1, 2, 3].map((i) => (
        <View key={i} className="bg-surface rounded-lg border border-border p-4 gap-3">
          <View className="flex-row items-center gap-3">
            <Skeleton.Circle className="w-10 h-10" />
            <View className="flex-1 gap-2">
              <Skeleton.Line className="w-32" height={14} />
              <Skeleton.Line className="w-20" height={10} />
            </View>
          </View>
          <Skeleton.Line className="w-full" height={16} lines={3} />
          <View className="flex-row gap-6">
            <Skeleton.Line className="w-12" height={14} />
            <Skeleton.Line className="w-12" height={14} />
            <Skeleton.Line className="w-12" height={14} />
          </View>
        </View>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function FeedEmpty({ isFollowing }: { isFollowing: boolean }) {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <View className="flex-1 items-center justify-center px-8 py-16">
      <View className="w-20 h-20 rounded-full bg-primary-tint items-center justify-center mb-6">
        <Icon name="Activity" size={32} color="primary" />
      </View>
      <Text variant="subtitle" className="text-text-primary text-center mb-2">
        {isFollowing ? t("feed.emptyTitleFollowing") : t("feed.emptyTitleNoFollowing")}
      </Text>
      <Text variant="body" className="text-text-secondary text-center mb-6">
        {isFollowing
          ? t("feed.emptySubtitleFollowing")
          : t("feed.emptySubtitleNoFollowing")}
      </Text>
      <Button
        variant="primary"
        icon="Search"
        onPress={() => router.push("/(tabs)/explore" as any)}
      >
        {t("feed.emptyCta")}
      </Button>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Search empty state
// ---------------------------------------------------------------------------

function SearchEmpty({ query }: { query: string }) {
  const { t } = useTranslation();
  return (
    <View className="flex-1 items-center justify-center px-8 py-16">
      <View className="w-20 h-20 rounded-full bg-primary-tint items-center justify-center mb-6">
        <Icon name="Search" size={32} color="primary" />
      </View>
      <Text variant="subtitle" className="text-text-primary text-center mb-2">
        {t("feed.searchEmpty")}
      </Text>
      <Text variant="body" className="text-text-secondary text-center mb-6">
        {query.trim()
          ? t("feed.searchBodyQuery").replace("{query}", query.trim())
          : t("feed.searchBodyGeneric")}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Error state
// ---------------------------------------------------------------------------

function FeedError({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <View className="flex-1 items-center justify-center px-8 py-16">
      <Icon name="Activity" size={32} color="text-tertiary" />
      <Text variant="subtitle" className="text-text-primary mt-4 mb-2 text-center">
        {t("feed.errorTitle")}
      </Text>
      <Text variant="body" className="text-text-secondary text-center mb-6">
        {t("feed.errorBody")}
      </Text>
      <Button variant="secondary" onPress={onRetry}>
        {t("feed.errorCta")}
      </Button>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function FeedScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const { t } = useTranslation();
  const userId = useAuthStore((s) => s.userId);
  const viewMode = useFeedStore((s) => s.viewMode);
  const setViewMode = useFeedStore((s) => s.setViewMode);
  const activeTag = useFeedStore((s) => s.activeTag);
  const filter = useFeedStore((s) => s.filter);
  const setFilter = useFeedStore((s) => s.setFilter);
  const { data: userSportsData } = useUserSports(userId);
  const { data: notifData } = useNotifications();
  const { addSearch } = useSearchHistory();

  const selectedPostId = useFeedStore((s) => s.selectedPostId);
  const setSelectedPostId = useFeedStore((s) => s.setSelectedPostId);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [searchOptions, setSearchOptions] = useState<SearchOptions>(DEFAULT_SEARCH_OPTIONS);

  const feedListRef = useRef<FlatList<FeedPost>>(null);
  const [savedScrollOffset, setSavedScrollOffset] = useState(0);
  const isRestoringScroll = useRef(false);

  const unreadCount = useMemo(() => {
    if (!notifData) return 0;
    if (Array.isArray(notifData)) return notifData.filter((n: any) => !n.read).length;
    return 0;
  }, [notifData]);

  const userSports = useMemo(() => {
    return userSportsData ?? [];
  }, [userSportsData]);

  const tagLabels: Record<string, string> = {
    "pour-toi": "For You",
    "abonnements": "Following",
  };

  // Active states drive the filter/sort button dots and the empty-state copy.
  const filtersActive =
    searchOptions.formats.length > 0 || searchOptions.tag.trim() !== "";
  const sortActive = searchOptions.sort !== "relevance";
  const isSearching = searchQuery.trim() !== "" || filtersActive || sortActive;
  const isGridAvailable = screenWidth >= 768;
  const useCenteredModal = screenWidth < 750;
  const showCommentPanel = !!selectedPostId && viewMode === "list";

  const handleToggleViewMode = useCallback(() => {
    setViewMode(viewMode === "list" ? "grid" : "list");
  }, [setViewMode, viewMode]);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    isRefetching,
    isLoading,
    isError,
    isFetchNextPageError,
    refetch,
  } = useFeed(activeTag ?? undefined, filter);

  const posts = useMemo(() => {
    if (!data) return [];
    // Flat-map pages then dedupe by id (shifted window / reordered rows).
    const flat = data.pages.flatMap((page: any) => page.items ?? []);
    const seen = new Set<string>();
    return flat.filter((p: FeedPost) => {
      if (!p || seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
  }, [data]);

  const { trendingTags, personalizedTags } = useFeedTagSuggestions(posts, userId ?? undefined);

  const filterTags = useMemo(() => {
    const base = ["pour-toi", "abonnements", ...userSports, ...trendingTags];
    return [...new Set(base)];
  }, [userSports, trendingTags]);

  const visiblePosts = useMemo(() => {
    return applySearch(posts, searchQuery, searchOptions);
  }, [posts, searchQuery, searchOptions]);

  const refreshing = isRefetching || (isFetching && !isFetchingNextPage && !isLoading);

  const handleRefresh = useCallback(() => {
    // Pull-to-refresh resets to page 1 via refetch of the infinite query.
    void refetch();
  }, [refetch]);

  const handleEndReached = useCallback(() => {
    // Guard against double-fire, end-of-list, and error states.
    if (!hasNextPage || isFetchingNextPage || isFetching || isError) return;
    void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, isFetching, isError, fetchNextPage]);

  const handleRetryNextPage = useCallback(() => {
    if (!hasNextPage || isFetchingNextPage) return;
    void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleOpenComments = useCallback(
    (postId: string) => {
      setSelectedPostId(postId);
    },
    [setSelectedPostId]
  );

  const handleCloseComments = useCallback(() => {
    setSelectedPostId(null);
  }, [setSelectedPostId]);

  const handleScrollBegin = useCallback(
    (event: any) => {
      if (!showCommentPanel) {
        const offsetY = event?.nativeEvent?.contentOffset?.y ?? 0;
        setSavedScrollOffset(offsetY);
      }
    },
    [showCommentPanel]
  );

  const handleTagPress = useCallback(
    (tag: string | null | undefined) => {
      if (!tag) return;
      if (tag === "pour-toi") {
        setFilter({ type: "for-you" });
      } else if (tag === "abonnements") {
        setFilter({ type: "following" });
      } else {
        setFilter({ type: "sport", sport: tag });
      }
    },
    [setFilter]
  );

  const isChipActive = useCallback(
    (tag: string) => {
      if (tag === "pour-toi") return filter.type === "for-you";
      if (tag === "abonnements") return filter.type === "following";
      return filter.type === "sport" && filter.sport === tag;
    },
    [filter]
  );

  const handleSubmitSearch = useCallback(() => {
    addSearch(searchQuery);
  }, [addSearch, searchQuery]);

  // Filter and sort buttons toggle their inline panel (opening one closes the
  // other — a single slot under the header), mirroring the explore screen.
  const handleOpenFilters = useCallback(() => {
    setFilterOpen((open) => {
      if (!open) setSortOpen(false);
      return !open;
    });
  }, []);
  const handleCloseFilters = useCallback(() => setFilterOpen(false), []);

  const handleOpenSort = useCallback(() => {
    setSortOpen((open) => {
      if (!open) setFilterOpen(false);
      return !open;
    });
  }, []);
  const handleCloseSort = useCallback(() => setSortOpen(false), []);

  const handleSortSelect = useCallback(
    (value: SearchSort) => setSearchOptions((o) => ({ ...o, sort: value })),
    []
  );

  const renderItem = useCallback(
    ({ item }: { item: FeedPost }) => (
      <PostCard
        post={item}
        onCommentPress={() => handleOpenComments(item.id)}
      />
    ),
    [handleOpenComments]
  );

  const keyExtractor = useCallback((item: FeedPost) => item.id, []);

  const centeredModalContentStyle = useMemo(
    () => ({
      paddingHorizontal: 16 as const,
      paddingTop: 4 as const,
      paddingBottom: 32 as const,
      maxWidth: 672 as const,
      width: "100%" as const,
      alignSelf: "center" as const,
    }),
    []
  );

  const listContentContainerStyle = useMemo(
    () => ({
      paddingHorizontal: 16 as const,
      paddingTop: 4 as const,
      paddingBottom: 32 as const,
      maxWidth: showCommentPanel && !useCenteredModal ? screenWidth * 0.45 : 672 as const,
      width: "100%" as const,
      alignSelf: "center" as const,
    }),
    [showCommentPanel, useCenteredModal, screenWidth]
  );

  React.useEffect(() => {
    if (!showCommentPanel && savedScrollOffset > 0 && isRestoringScroll.current) {
      isRestoringScroll.current = false;
      const timer = setTimeout(() => {
        feedListRef.current?.scrollToOffset({
          offset: savedScrollOffset,
          animated: false,
        });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [showCommentPanel, savedScrollOffset]);

  // ------------------------------------------------------------------
  // Loading state
  // ------------------------------------------------------------------
  if (isLoading) {
    return (
      <SafeScreen edges={["top"]}>
        <FeedFilterSortBar
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          onSearchClear={() => setSearchQuery("")}
          onSubmitSearch={handleSubmitSearch}
          filterActive={filtersActive}
          onFilterPress={handleOpenFilters}
          sortActive={sortActive}
          onSortPress={handleOpenSort}
          isGridAvailable={isGridAvailable}
          viewMode={viewMode}
          onToggleViewMode={handleToggleViewMode}
        />
        {filterOpen ? (
          <FeedFilterPanel
            options={searchOptions}
            onChange={setSearchOptions}
            onClose={handleCloseFilters}
          />
        ) : null}
        {sortOpen ? (
          <FeedSortPanel
            value={searchOptions.sort}
            onSelect={handleSortSelect}
            onClose={handleCloseSort}
          />
        ) : null}
        <FeedSkeleton />
      </SafeScreen>
    );
  }

  // ------------------------------------------------------------------
  // Error state
  // ------------------------------------------------------------------
  if (isError) {
    return (
      <SafeScreen edges={["top"]}>
        <FeedFilterSortBar
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          onSearchClear={() => setSearchQuery("")}
          onSubmitSearch={handleSubmitSearch}
          filterActive={filtersActive}
          onFilterPress={handleOpenFilters}
          sortActive={sortActive}
          onSortPress={handleOpenSort}
          isGridAvailable={isGridAvailable}
          viewMode={viewMode}
          onToggleViewMode={handleToggleViewMode}
        />
        {filterOpen ? (
          <FeedFilterPanel
            options={searchOptions}
            onChange={setSearchOptions}
            onClose={handleCloseFilters}
          />
        ) : null}
        {sortOpen ? (
          <FeedSortPanel
            value={searchOptions.sort}
            onSelect={handleSortSelect}
            onClose={handleCloseSort}
          />
        ) : null}
        <FeedError onRetry={() => void refetch()} />
      </SafeScreen>
    );
  }

  // ------------------------------------------------------------------
  // Normal feed
  // ------------------------------------------------------------------
  return (
    <SafeScreen edges={["top"]}>
      <FeedFilterSortBar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        onSearchClear={() => setSearchQuery("")}
        onSubmitSearch={handleSubmitSearch}
        filterActive={filtersActive}
        onFilterPress={handleOpenFilters}
        sortActive={sortActive}
        onSortPress={handleOpenSort}
        isGridAvailable={isGridAvailable}
        viewMode={viewMode}
        onToggleViewMode={handleToggleViewMode}
      />

      {/* Inline filter panel */}
      {filterOpen ? (
        <FeedFilterPanel
          options={searchOptions}
          onChange={setSearchOptions}
          onClose={handleCloseFilters}
        />
      ) : null}
      {sortOpen ? (
        <FeedSortPanel
          value={searchOptions.sort}
          onSelect={handleSortSelect}
          onClose={handleCloseSort}
        />
      ) : null}

      {/* Filter chips — sticky */}
      <React.Fragment>
        <View className="bg-bg dark:bg-bg-dark">
          <View className="py-2">
            <FlatList
              horizontal
              data={filterTags}
              keyExtractor={(item) => item}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
              renderItem={({ item }) => (
                <PressableScale
                  onPress={() => handleTagPress(item)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isChipActive(item) }}
                  scaleOnHover={CHIP_SCALE_HOVER}
                  scaleOnPress={CHIP_SCALE_PRESS}
                >
                  <Tag variant="chip" active={isChipActive(item)}>
                    {tagLabels[item] ?? item}
                  </Tag>
                </PressableScale>
              )}
            />
          </View>
          {personalizedTags.length > 0 ? (
            <View className="pb-2">
              <Text className="px-4 text-xs font-semibold text-neutral-500 mb-1">
                {t("feed.suggestionsForYou")}
              </Text>
              <FlatList
                horizontal
                data={personalizedTags}
                keyExtractor={(item) => item}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
                renderItem={({ item }) => (
                  <PressableScale
                    onPress={() => handleTagPress(item)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isChipActive(item) }}
                    scaleOnHover={CHIP_SCALE_HOVER}
                    scaleOnPress={CHIP_SCALE_PRESS}
                  >
                    <Tag variant="chip" active={isChipActive(item)}>
                      {item}
                    </Tag>
                  </PressableScale>
                )}
              />
            </View>
          ) : null}
        </View>
      </React.Fragment>

      {visiblePosts.length === 0 ? (
        isSearching ? (
          <SearchEmpty query={searchQuery} />
        ) : (
          <FeedEmpty isFollowing={filter.type === "following"} />
        )
      ) : viewMode === "grid" && isGridAvailable ? (
        <FeedGrid posts={visiblePosts} viewMode={viewMode} screenWidth={screenWidth} />
      ) : (
        <View
          className="flex-1"
          style={{
            flexDirection: useCenteredModal && showCommentPanel ? "column" : "row",
          }}
        >
          {/* Feed list - always mounted to preserve scroll across comment open/close */}
          <View
            className="flex-1"
            style={{
              width: showCommentPanel && !useCenteredModal ? "50%" : "100%",
            }}
          >
            <FlatList
              ref={feedListRef}
              data={visiblePosts}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
              contentContainerStyle={
                showCommentPanel && useCenteredModal
                  ? centeredModalContentStyle
                  : listContentContainerStyle
              }
              onEndReached={handleEndReached}
              onEndReachedThreshold={0.5}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
              }
              ListFooterComponent={
                isFetchingNextPage ? (
                  <View className="py-4 gap-3">
                    <Skeleton className="w-full h-32 rounded-lg" />
                  </View>
                ) : isFetchNextPageError && hasNextPage ? (
                  <View className="py-4 items-center gap-2">
                    <Text variant="body" className="text-text-secondary text-center">
                      {t("feed.errorBody")}
                    </Text>
                    <Button variant="secondary" onPress={handleRetryNextPage}>
                      {t("feed.errorCta")}
                    </Button>
                  </View>
                ) : !hasNextPage && visiblePosts.length > 0 ? (
                  <View className="py-4 items-center">
                    <Text variant="caption" className="text-text-tertiary text-center">
                      {t("feed.endReached")}
                    </Text>
                  </View>
                ) : null
              }
              onScrollBeginDrag={handleScrollBegin}
              scrollEventThrottle={16}
            />
          </View>

          {/* Side Comment Panel - large screens */}
          {showCommentPanel && !useCenteredModal && (
            <View
              className="border-l border-border flex-1 min-h-0"
              style={{
                width: "50%",
                height: "100%",
              }}
            >
              <CommentPanel
                postId={selectedPostId}
                visible={showCommentPanel}
                onClose={handleCloseComments}
              />
            </View>
          )}

          {/* Centered overlay modal - narrow screens */}
          {useCenteredModal && showCommentPanel && (
            <CommentCenteredModal
              postId={selectedPostId}
              visible={showCommentPanel}
              onClose={() => {
                isRestoringScroll.current = true;
                handleCloseComments();
              }}
            />
          )}
        </View>
      )}
    </SafeScreen>
  );
}

