// ---------------------------------------------------------------------------
// PULSE FEED SCREEN
//
// Top bar: Pulse logo (Activity icon in rounded primary bg) + search bar + Bell badge
// Search panel: advanced options (scopes, sort, format, tag) + history
//   → collapsible / minimizable via drag-down, backdrop tap, or chevron button
// Filter row: sticky chips (Pour toi, Abonnements, sports) — filter the feed
// Post list: PostCard components with skeleton/empty/error states
// ---------------------------------------------------------------------------

import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  View,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { useAuthStore } from "@/stores/authStore";
import { useFeedStore } from "@/stores/feedStore";
import { useFeed } from "@/hooks/useFeed";
import { useNotifications } from "@/hooks/useNotifications";
import { useUserSports } from "@/hooks/useUserSports";
import { useSearchHistory } from "@/hooks/useSearchHistory";
import { useFeedTagSuggestions } from "@/hooks/useFeedTagSuggestions";
import {
  SearchPanel,
  applySearch,
  DEFAULT_SEARCH_OPTIONS,
  type SearchOptions,
} from "@/components/feed/SearchPanel";
import { SearchBar } from "@/components/shared/SearchBar";
import type { FeedPost } from "@/types";

import { Text } from "@/components/ui/Text";
import { Icon } from "@/components/ui/Icon";
import { Tag } from "@/components/ui/Tag";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { PostCard } from "@/components/feed/PostCard";
import { FeedGrid } from "@/components/feed/FeedGrid";
import { CommentPanel } from "@/components/feed/CommentPanel";
import { CommentCenteredModal } from "@/components/feed/CommentCenteredModal";
import { SafeScreen } from "@/components/shared/SafeScreen";
import { useTranslation } from "@/hooks/useTranslation";

// ---------------------------------------------------------------------------
// Skeleton placeholder
// ---------------------------------------------------------------------------

function FeedSkeleton() {
  return (
    <View className="px-4 pt-4 gap-4">
      {[1, 2, 3].map((i) => (
        <View key={i} className="bg-surface rounded-lg border border-border p-4 gap-3">
          <View className="flex-row items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-full" />
            <View className="flex-1 gap-2">
              <Skeleton className="w-32 h-4 rounded-sm" />
              <Skeleton className="w-20 h-3 rounded-sm" />
            </View>
          </View>
          <Skeleton className="w-full h-16 rounded-sm" />
          <View className="flex-row gap-6">
            <Skeleton className="w-12 h-4 rounded-sm" />
            <Skeleton className="w-12 h-4 rounded-sm" />
            <Skeleton className="w-12 h-4 rounded-sm" />
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
  const { history, addSearch, removeSearch, clearHistory } = useSearchHistory();

  const selectedPostId = useFeedStore((s) => s.selectedPostId);
  const setSelectedPostId = useFeedStore((s) => s.setSelectedPostId);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [searchMinimized, setSearchMinimized] = useState(false);
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

  const isSearching = searchExpanded && !searchMinimized;
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
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
  } = useFeed(activeTag ?? undefined, filter);

  const posts = useMemo(() => {
    if (!data) return [];
    return data.pages.flatMap((page: any) => page.items ?? []);
  }, [data]);

  const { trendingTags, personalizedTags } = useFeedTagSuggestions(posts, userId ?? undefined);

  const filterTags = useMemo(() => {
    const base = ["pour-toi", "abonnements", ...userSports, ...trendingTags];
    return [...new Set(base)];
  }, [userSports, trendingTags]);

  const visiblePosts = useMemo(() => {
    return applySearch(posts, searchQuery, searchOptions);
  }, [posts, searchQuery, searchOptions]);

  const handleRefresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleEndReached = useCallback(() => {
    if (hasNextPage) void fetchNextPage();
  }, [hasNextPage, fetchNextPage]);

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

  const handleSelectHistory = useCallback(
    (q: string) => {
      setSearchQuery(q);
      addSearch(q);
    },
    [addSearch]
  );

  const handleCollapseSearch = useCallback(() => {
    setSearchExpanded(false);
    setSearchMinimized(false);
    setSearchQuery("");
    setSearchOptions(DEFAULT_SEARCH_OPTIONS);
  }, []);

  const handleToggleMinimize = useCallback(() => {
    setSearchMinimized((prev) => !prev);
  }, []);

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
        <FeedTopBar
          unreadCount={unreadCount}
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          onSearchClear={() => setSearchQuery("")}
          onSearchCollapse={handleCollapseSearch}
          onSearchPress={() => setSearchExpanded(true)}
          searchExpanded={searchExpanded}
          onSubmitSearch={handleSubmitSearch}
          viewMode={viewMode}
          onToggleViewMode={handleToggleViewMode}
          isGridAvailable={isGridAvailable}
        />
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
        <FeedTopBar
          unreadCount={unreadCount}
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          onSearchClear={() => setSearchQuery("")}
          onSearchCollapse={handleCollapseSearch}
          onSearchPress={() => setSearchExpanded(true)}
          searchExpanded={searchExpanded}
          onSubmitSearch={handleSubmitSearch}
          viewMode={viewMode}
          onToggleViewMode={handleToggleViewMode}
          isGridAvailable={isGridAvailable}
        />
        <FeedError onRetry={() => void refetch()} />
      </SafeScreen>
    );
  }

  // ------------------------------------------------------------------
  // Normal feed
  // ------------------------------------------------------------------
  return (
    <SafeScreen edges={["top"]}>
      <FeedTopBar
        unreadCount={unreadCount}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        onSearchClear={() => setSearchQuery("")}
        onSearchCollapse={handleCollapseSearch}
        onSearchPress={() => setSearchExpanded(true)}
        searchExpanded={searchExpanded}
        onSubmitSearch={handleSubmitSearch}
        viewMode={viewMode}
        onToggleViewMode={handleToggleViewMode}
        isGridAvailable={isGridAvailable}
      />

      {/* Advanced search panel — collapsible */}
      {searchExpanded ? (
        <SearchPanel
          options={searchOptions}
          onChange={setSearchOptions}
          history={history}
          onSelectHistory={handleSelectHistory}
          onRemoveHistory={removeSearch}
          onClearHistory={clearHistory}
          minimized={searchMinimized}
          onToggleMinimize={handleToggleMinimize}
        />
      ) : null}

      {/* Filter chips — sticky, hidden while search is expanded (not minimized) */}
      {!searchExpanded || searchMinimized ? (
        <View className="bg-bg dark:bg-bg-dark">
          <View className="py-2">
            <FlatList
              horizontal
              data={filterTags}
              keyExtractor={(item) => item}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
              renderItem={({ item }) => (
                <Pressable onPress={() => handleTagPress(item)}>
                  <Tag variant="chip" active={isChipActive(item)}>
                    {tagLabels[item] ?? item}
                  </Tag>
                </Pressable>
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
                  <Pressable onPress={() => handleTagPress(item)}>
                    <Tag variant="chip" active={isChipActive(item)}>
                      {item}
                    </Tag>
                  </Pressable>
                )}
              />
            </View>
          ) : null}
        </View>
      ) : null}

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
                <RefreshControl refreshing={false} onRefresh={handleRefresh} />
              }
              ListFooterComponent={
                isFetchingNextPage ? (
                  <View className="py-4 gap-3">
                    <Skeleton className="w-full h-32 rounded-lg" />
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
              className="border-l border-border"
              style={{
                width: "50%",
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

// ---------------------------------------------------------------------------
// Top bar sub-component
// ---------------------------------------------------------------------------

type FeedTopBarProps = {
  unreadCount: number;
  searchValue: string;
  onSearchChange: (t: string) => void;
  onSearchClear: () => void;
  onSearchCollapse: () => void;
  onSearchPress: () => void;
  searchExpanded: boolean;
  onSubmitSearch: () => void;
  viewMode: "list" | "grid";
  onToggleViewMode: () => void;
  isGridAvailable: boolean;
};

function FeedTopBar({
  unreadCount,
  searchValue,
  onSearchChange,
  onSearchClear,
  onSearchCollapse,
  onSearchPress,
  searchExpanded,
  onSubmitSearch,
  viewMode,
  onToggleViewMode,
  isGridAvailable,
}: FeedTopBarProps) {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <View className="flex-row items-center justify-between px-4 py-3 bg-bg dark:bg-bg-dark gap-3">
      {/* Logo mark — Activity icon in rounded square */}
      <View className="w-10 h-10 rounded-xs bg-primary items-center justify-center overflow-hidden">
        <Image
          source={require("@/assets/logo/pulse-icon.png")}
          style={{ width: 40, height: 40 }}
          contentFit="contain"
        />
      </View>

      {/* Search bar */}
      <View className="flex-1">
        <SearchBar
          value={searchValue}
          onChangeText={onSearchChange}
          onClear={onSearchClear}
          onCollapse={onSearchCollapse}
          onPress={onSearchPress}
          expanded={searchExpanded}
          onSubmitEditing={onSubmitSearch}
          placeholder={t("feed.searchPlaceholder")}
        />
      </View>

      {/* View mode toggle + Bell with badge */}
      <View className="flex-row items-center gap-2">
        {isGridAvailable ? (
          <Pressable
            onPress={onToggleViewMode}
            accessibilityRole="button"
            accessibilityLabel={viewMode === "list" ? t("common.viewList") : t("common.viewGrid")}
            className="p-2 rounded-full bg-surface dark:bg-surface-dark"
          >
            <Icon
              name={viewMode === "list" ? "PanelLeft" : "PanelBottom"}
              size={20}
              color="text-secondary"
            />
          </Pressable>
        ) : null}

        <Pressable
          onPress={() => router.push("/(tabs)/profile/notifications" as any)}
          accessibilityRole="button"
          accessibilityLabel={t("common.notifications") + (unreadCount > 0 ? `, ${unreadCount} non lues` : "")}
          className="relative"
        >
          <Icon name="Bell" size={24} color="text-secondary" />
          {unreadCount > 0 ? (
            <View className="absolute -top-1 -right-1 bg-coral-600 rounded-full min-w-[18px] h-[18px] items-center justify-center px-1">
              <Text variant="caption" className="text-white text-[10px] leading-none">
                {unreadCount > 99 ? "99+" : unreadCount}
              </Text>
            </View>
          ) : null}
        </Pressable>
      </View>
    </View>
  );
}