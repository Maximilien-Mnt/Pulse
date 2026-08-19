// ---------------------------------------------------------------------------
// PULSE EXPLORE SCREEN
//
// Segmented toggle (Clubs / Événements), search bar, sport chips,
// and responsive list/grid of ClubCard / EventCard components.
// ---------------------------------------------------------------------------

import React, { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { useClubs } from "@/hooks/useClubs";
import { useEvents } from "@/hooks/useEvents";
import { useAuthStore } from "@/stores/authStore";
import { SPORTS } from "@/lib/constants";
import type { SportId } from "@/lib/constants";
import { cn } from "@/utils/format";

import { Text } from "@/components/ui/Text";
import { Icon } from "@/components/ui/Icon";
import { Tag } from "@/components/ui/Tag";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { ClubCard } from "@/components/explore/ClubCard";
import { EventCard } from "@/components/explore/EventCard";
import { SafeScreen } from "@/components/shared/SafeScreen";
import { useFeedLayout } from "@/hooks/useFeedLayout";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ExploreTab = "clubs" | "events";
type ViewMode = "list" | "grid";

// ---------------------------------------------------------------------------
// Sport color map — light backgrounds with dark text per design spec
// ---------------------------------------------------------------------------

const SPORT_CHIP_COLORS: Record<string, { bg: string; text: string }> = {
  football:   { bg: "bg-green-50",   text: "text-green-700" },
  basketball: { bg: "bg-primary-tint", text: "text-primary-active" },
  tennis:     { bg: "bg-green-50",   text: "text-green-700" },
  running:    { bg: "bg-primary-tint", text: "text-primary-active" },
  cycling:    { bg: "bg-green-50",   text: "text-green-700" },
  swimming:   { bg: "bg-primary-tint", text: "text-primary-active" },
  volleyball: { bg: "bg-coral-50",   text: "text-coral-700" },
  handball:   { bg: "bg-coral-50",   text: "text-coral-700" },
  padel:      { bg: "bg-primary-tint", text: "text-primary-active" },
  badminton:  { bg: "bg-green-50",   text: "text-green-700" },
  fitness:    { bg: "bg-coral-50",   text: "text-coral-700" },
  rugby:      { bg: "bg-green-50",   text: "text-green-700" },
};

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function ExploreSkeleton() {
  return (
    <View className="px-4 pt-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <View key={i} className="bg-surface rounded-lg border border-border overflow-hidden">
          <Skeleton className="w-full h-40 rounded-none" />
          <View className="p-4 gap-3">
            <Skeleton className="w-3/4 h-5 rounded-sm" />
            <Skeleton className="w-1/2 h-4 rounded-sm" />
            <Skeleton className="w-full h-10 rounded-md" />
          </View>
        </View>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function ExploreEmpty({ tab }: { tab: ExploreTab }) {
  return (
    <View className="flex-1 items-center justify-center px-8 py-16">
      <Icon name="Search" size={32} color="text-tertiary" />
      <Text variant="subtitle" className="text-text-primary mt-4 mb-2 text-center">
        Aucun résultat
      </Text>
      <Text variant="body" className="text-text-secondary text-center">
        {tab === "clubs"
          ? "Aucun club ne correspond à ta recherche."
          : "Aucun événement ne correspond à ta recherche."}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function ExploreScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const userId = useAuthStore((s) => s.userId);

  const [tab, setTab] = useState<ExploreTab>("clubs");
  const [search, setSearch] = useState("");
  const [activeSport, setActiveSport] = useState<SportId | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  // Fetch data based on active tab
  const {
    data: clubsData,
    isLoading: clubsLoading,
    isError: clubsError,
    refetch: refetchClubs,
    fetchNextPage: fetchNextClubs,
    hasNextPage: hasNextClubs,
    isFetchingNextPage: fetchingNextClubs,
  } = useClubs(
    {
      sports: activeSport ? [activeSport] : [],
      location: tab === "clubs" ? search : "",
      requiredLevel: "",
      internalOnly: false,
      externalOnly: false,
      favoritesOnly: false,
      sort: "relevance",
    },
    userId,
  );

  const {
    data: eventsData,
    isLoading: eventsLoading,
    isError: eventsError,
    refetch: refetchEvents,
    fetchNextPage: fetchNextEvents,
    hasNextPage: hasNextEvents,
    isFetchingNextPage: fetchingNextEvents,
  } = useEvents(
    {
      sports: activeSport ? [activeSport] : [],
      location: tab === "events" ? search : "",
      dateFrom: null,
      dateTo: null,
      requiredLevel: "",
      difficultyMin: 0,
      difficultyMax: 5,
      category: "",
      paidOnly: null,
      internalOnly: false,
      externalOnly: false,
      favoritesOnly: false,
      sort: "relevance",
    },
    userId,
  );

  const isLoading = tab === "clubs" ? clubsLoading : eventsLoading;
  const isError = tab === "clubs" ? clubsError : eventsError;
  const refetch = tab === "clubs" ? refetchClubs : refetchEvents;
  const fetchNext = tab === "clubs" ? fetchNextClubs : fetchNextEvents;
  const hasNext = tab === "clubs" ? hasNextClubs : hasNextEvents;
  const isFetchingNext = tab === "clubs" ? fetchingNextClubs : fetchingNextEvents;

  const items = useMemo(() => {
    const raw = tab === "clubs" ? clubsData : eventsData;
    if (!raw) return [];
    return raw.pages.flatMap((page: any) =>
      Array.isArray(page) ? page : page.items ?? []
    );
  }, [tab, clubsData, eventsData]);

  const handleRefresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleEndReached = useCallback(() => {
    if (hasNext) void fetchNext();
  }, [hasNext, fetchNext]);

  const handleSportToggle = useCallback(
    (sportId: SportId) => {
      setActiveSport((prev) => (prev === sportId ? null : sportId));
    },
    []
  );

  const handleToggleViewMode = useCallback(() => {
    setViewMode((prev) => (prev === "list" ? "grid" : "list"));
  }, []);

  const isGridAvailable = width >= 768;

  // Use the shared feed layout hook (up to 5 columns in grid mode)
  const { columns, cellWidth, rows } = useFeedLayout(
    items as any,
    viewMode,
    width,
    5
  );

  const renderItem = useCallback(
    ({ item }: { item: any }) => {
      const isCompact = viewMode === "list";
      const isGrid = viewMode === "grid";
      if (tab === "clubs") {
        return <ClubCard club={item} isCompact={isCompact} grid={isGrid} />;
      }
      return <EventCard event={item} isCompact={isCompact} grid={isGrid} />;
    },
    [tab, viewMode]
  );

  const keyExtractor = useCallback((item: any) => item.id, []);

  // ------------------------------------------------------------------
  // Loading
  // ------------------------------------------------------------------
  if (isLoading) {
    return (
      <SafeScreen edges={["top"]}>
        <ExploreHeader
          tab={tab}
          setTab={setTab}
          search={search}
          setSearch={setSearch}
          activeSport={activeSport}
          onSportToggle={handleSportToggle}
          viewMode={viewMode}
          onToggleViewMode={handleToggleViewMode}
          isGridAvailable={isGridAvailable}
        />
        <ExploreSkeleton />
      </SafeScreen>
    );
  }

  // ------------------------------------------------------------------
  // Error
  // ------------------------------------------------------------------
  if (isError) {
    return (
      <SafeScreen edges={["top"]}>
        <ExploreHeader
          tab={tab}
          setTab={setTab}
          search={search}
          setSearch={setSearch}
          activeSport={activeSport}
          onSportToggle={handleSportToggle}
          viewMode={viewMode}
          onToggleViewMode={handleToggleViewMode}
          isGridAvailable={isGridAvailable}
        />
        <View className="flex-1 items-center justify-center px-8">
          <Icon name="Search" size={32} color="text-tertiary" />
          <Text variant="subtitle" className="text-text-primary mt-4 mb-2 text-center">
            Erreur de chargement
          </Text>
          <Button variant="secondary" onPress={() => void refetch()}>
            Réessayer
          </Button>
        </View>
      </SafeScreen>
    );
  }

  // ------------------------------------------------------------------
  // Normal
  // ------------------------------------------------------------------
  return (
    <SafeScreen edges={["top"]}>
      <ExploreHeader
        tab={tab}
        setTab={setTab}
        search={search}
        setSearch={setSearch}
        activeSport={activeSport}
        onSportToggle={handleSportToggle}
        viewMode={viewMode}
        onToggleViewMode={handleToggleViewMode}
        isGridAvailable={isGridAvailable}
      />

      {items.length === 0 ? (
        <ExploreEmpty tab={tab} />
      ) : viewMode === "grid" && isGridAvailable ? (
        // Grid mode — scrollable FlatList using pre-computed masonry rows
        <FlatList
          key="grid"
          className="flex-1"
          data={rows}
          keyExtractor={(_, index) => `row-${index}`}
          renderItem={({ item: row, index: rowIndex }) => (
            <View
              key={rowIndex}
              className="flex-row"
              style={{
                paddingHorizontal: 16,
                gap: 12,
                marginBottom: 16,
              }}
            >
              {row.posts.map((post) => (
                <View
                  key={post.id}
                  style={{
                    width: cellWidth,
                    flex: row.columnCount,
                  }}
                >
                  {renderItem({ item: post })}
                </View>
              ))}
            </View>
          )}
          contentContainerStyle={{
            paddingTop: 4,
            paddingBottom: 32,
          }}
          showsVerticalScrollIndicator={false}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={handleRefresh} />
          }
          ListFooterComponent={
            isFetchingNext ? (
              <View className="py-4">
                <Skeleton className="w-full h-32 rounded-lg" />
              </View>
            ) : null
          }
        />
      ) : (
        // List mode - single column
        <FlatList
          key="list"
          data={items}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 4,
            paddingBottom: 32,
          }}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={handleRefresh} />
          }
          ListFooterComponent={
            isFetchingNext ? (
              <View className="py-4">
                <Skeleton className="w-full h-32 rounded-lg" />
              </View>
            ) : null
          }
        />
      )}
    </SafeScreen>
  );
}

// ---------------------------------------------------------------------------
// Header sub-component (segment + search + sport chips + view toggle)
// ---------------------------------------------------------------------------

function ExploreHeader({
  tab,
  setTab,
  search,
  setSearch,
  activeSport,
  onSportToggle,
  viewMode,
  onToggleViewMode,
  isGridAvailable,
}: {
  tab: ExploreTab;
  setTab: (t: ExploreTab) => void;
  search: string;
  setSearch: (s: string) => void;
  activeSport: SportId | null;
  onSportToggle: (sportId: SportId) => void;
  viewMode: ViewMode;
  onToggleViewMode: () => void;
  isGridAvailable: boolean;
}) {
  return (
    <View className="bg-bg dark:bg-bg-dark">
      {/* Segmented toggle */}
      <View className="px-4 pt-3 pb-2">
        <View className="flex-row bg-neutral-50 dark:bg-neutral-800 rounded-full p-1">
          <Pressable
            onPress={() => setTab("clubs")}
            className={cn(
              "flex-1 items-center py-2.5 rounded-full",
              tab === "clubs" ? "bg-primary dark:bg-primary-dark" : "bg-transparent"
            )}
          >
            <Text
              variant="buttonLabel"
              className={tab === "clubs" ? "text-white" : "text-text-secondary"}
            >
              Clubs
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setTab("events")}
            className={cn(
              "flex-1 items-center py-2.5 rounded-full",
              tab === "events" ? "bg-primary dark:bg-primary-dark" : "bg-transparent"
            )}
          >
            <Text
              variant="buttonLabel"
              className={tab === "events" ? "text-white" : "text-text-secondary"}
            >
              Événements
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Search bar + View toggle */}
      <View className="px-4 pb-2">
        <View className="flex-row items-center gap-2">
          <View className="flex-1 flex-row items-center bg-neutral-50 dark:bg-neutral-800 rounded-full px-4 h-11 gap-2">
            <Icon name="Search" size={16} color="text-tertiary" />
            <TextInput
              className="flex-1 text-base text-text-primary font-inter"
              placeholder={
                tab === "clubs"
                  ? "Rechercher un club"
                  : "Rechercher un événement"
              }
              placeholderTextColor={undefined}
              value={search}
              onChangeText={setSearch}
            />
          </View>

          {/* View mode toggle */}
          {isGridAvailable ? (
            <Pressable
              onPress={onToggleViewMode}
              accessibilityRole="button"
              accessibilityLabel={viewMode === "list" ? "Vue liste" : "Vue grille"}
              className="p-2 rounded-full bg-surface dark:bg-surface-dark"
            >
              <Icon
                name={viewMode === "list" ? "LayoutGrid" : "List"}
                size={20}
                color="text-secondary"
              />
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Sport chips */}
      <View className="pb-3">
        <FlatList
          horizontal
          data={SPORTS}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
          renderItem={({ item }) => {
            const active = activeSport === item.id;
            const colors = SPORT_CHIP_COLORS[item.id] ?? {
              bg: "bg-neutral-50 dark:bg-neutral-800",
              text: "text-neutral-600",
            };

            return (
              <Pressable onPress={() => onSportToggle(item.id)}>
                <View
                  className={cn(
                    "self-start rounded-full px-4 py-2",
                    active ? colors.bg : "bg-neutral-50 dark:bg-neutral-800"
                  )}
                >
                  <Text
                    variant="caption"
                    className={active ? colors.text : "text-text-secondary"}
                  >
                    {item.label}
                  </Text>
                </View>
              </Pressable>
            );
          }}
        />
      </View>
    </View>
  );
}
