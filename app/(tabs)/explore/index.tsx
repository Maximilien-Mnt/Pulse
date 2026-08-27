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
import type { ClubListFilters } from "@/hooks/useClubs";
import type { EventListFilters } from "@/hooks/useEvents";
import { useLocation } from "@/hooks/useLocation";
import { useAuthStore } from "@/stores/authStore";
import { CLUB_SORT_OPTIONS, EVENT_SORT_OPTIONS } from "@/lib/constants";
import { cn } from "@/utils/format";

import { Text } from "@/components/ui/Text";
import { Icon } from "@/components/ui/Icon";
import { Tag } from "@/components/ui/Tag";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { ClubCard } from "@/components/explore/ClubCard";
import { EventCard } from "@/components/explore/EventCard";
import { ClubFilters } from "@/components/clubs/ClubFilters";
import { EventFilters } from "@/components/events/EventFilters";
import { SortSheet } from "@/components/shared/SortSheet";
import { SafeScreen } from "@/components/shared/SafeScreen";
import { useFeedLayout } from "@/hooks/useFeedLayout";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ExploreTab = "clubs" | "events";
type ViewMode = "list" | "grid";

// ---------------------------------------------------------------------------
// Default filters (mirror the current explore behavior)
// ---------------------------------------------------------------------------

const defaultClubFilters: ClubListFilters = {
  sports: [],
  location: "",
  requiredLevel: "",
  internalOnly: false,
  externalOnly: false,
  favoritesOnly: false,
  sort: "relevance",
  radiusKm: 10,
};

const defaultEventFilters: EventListFilters = {
  sports: [],
  location: "",
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
  radiusKm: 10,
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
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  // Filter/sort modal state (per tab)
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [clubFilters, setClubFilters] = useState<ClubListFilters>(defaultClubFilters);
  const [eventFilters, setEventFilters] = useState<EventListFilters>(defaultEventFilters);

  const { latitude, longitude, isLocationEnabled, requestPermission } = useLocation();

  // Effective filters = modal filters overlaid with the quick-access controls
  // (search bar). Location is attached when "nearby" is selected.
  const clubQueryFilters = useMemo<ClubListFilters>(() => ({
    ...clubFilters,
    sports: clubFilters.sports,
    location: tab === "clubs" && search ? search : clubFilters.location,
    ...(clubFilters.sort === "nearby" && latitude !== null && longitude !== null
      ? { userLat: latitude, userLon: longitude }
      : {}),
  }), [clubFilters, search, tab, latitude, longitude]);

  const eventQueryFilters = useMemo<EventListFilters>(() => ({
    ...eventFilters,
    sports: eventFilters.sports,
    location: tab === "events" && search ? search : eventFilters.location,
    ...(eventFilters.sort === "nearby" && latitude !== null && longitude !== null
      ? { userLat: latitude, userLon: longitude }
      : {}),
  }), [eventFilters, search, tab, latitude, longitude]);

  // True when the modal filters for the active tab differ from their defaults
  // (ignoring the quick-access sport chip, which has its own visual indicator).
  const clubFiltersActive = useMemo(
    () =>
      clubFilters.location !== "" ||
      clubFilters.requiredLevel !== "" ||
      clubFilters.internalOnly ||
      clubFilters.externalOnly ||
      clubFilters.favoritesOnly ||
      clubFilters.sports.length > 0,
    [clubFilters]
  );

  const eventFiltersActive = useMemo(
    () =>
      eventFilters.location !== "" ||
      eventFilters.dateFrom !== null ||
      eventFilters.dateTo !== null ||
      eventFilters.requiredLevel !== "" ||
      eventFilters.difficultyMax !== 5 ||
      eventFilters.difficultyMin !== 0 ||
      eventFilters.category !== "" ||
      eventFilters.paidOnly !== null ||
      eventFilters.internalOnly ||
      eventFilters.externalOnly ||
      eventFilters.favoritesOnly ||
      eventFilters.sports.length > 0,
    [eventFilters]
  );

  const handleOpenFilters = useCallback(() => setFilterOpen(true), []);
  const handleCloseFilters = useCallback(() => setFilterOpen(false), []);

  const handleOpenSort = useCallback(() => setSortOpen(true), []);
  const handleCloseSort = useCallback(() => setSortOpen(false), []);

  // True when the selected sort for the active tab differs from its default.
  const clubSortActive = clubFilters.sort !== defaultClubFilters.sort;
  const eventSortActive = eventFilters.sort !== defaultEventFilters.sort;

  // Keep the sort in sync with the active tab.
  const handleSortSelect = useCallback(
    (value: string) => {
      if (tab === "clubs") {
        setClubFilters((f) => ({ ...f, sort: value }));
      } else {
        setEventFilters((f) => ({ ...f, sort: value }));
      }
    },
    [tab]
  );

  const handleRadiusChange = useCallback((km: number) => {
    if (tab === "clubs") {
      setClubFilters((f) => ({ ...f, radiusKm: km }));
    } else {
      setEventFilters((f) => ({ ...f, radiusKm: km }));
    }
  }, [tab]);

  // Fetch data based on active tab
  const {
    data: clubsData,
    isLoading: clubsLoading,
    isError: clubsError,
    refetch: refetchClubs,
    fetchNextPage: fetchNextClubs,
    hasNextPage: hasNextClubs,
    isFetchingNextPage: fetchingNextClubs,
  } = useClubs(clubQueryFilters, userId);

  const {
    data: eventsData,
    isLoading: eventsLoading,
    isError: eventsError,
    refetch: refetchEvents,
    fetchNextPage: fetchNextEvents,
    hasNextPage: hasNextEvents,
    isFetchingNextPage: fetchingNextEvents,
  } = useEvents(eventQueryFilters, userId);

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
          viewMode={viewMode}
          onToggleViewMode={handleToggleViewMode}
          isGridAvailable={isGridAvailable}
          onOpenFilterModal={handleOpenFilters}
          filterActive={tab === "clubs" ? clubFiltersActive : eventFiltersActive}
          onOpenSort={handleOpenSort}
          sortActive={tab === "clubs" ? clubSortActive : eventSortActive}
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
          viewMode={viewMode}
          onToggleViewMode={handleToggleViewMode}
          isGridAvailable={isGridAvailable}
          onOpenFilterModal={handleOpenFilters}
          filterActive={tab === "clubs" ? clubFiltersActive : eventFiltersActive}
          onOpenSort={handleOpenSort}
          sortActive={tab === "clubs" ? clubSortActive : eventSortActive}
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
        viewMode={viewMode}
        onToggleViewMode={handleToggleViewMode}
        isGridAvailable={isGridAvailable}
        onOpenFilterModal={handleOpenFilters}
        filterActive={tab === "clubs" ? clubFiltersActive : eventFiltersActive}
        onOpenSort={handleOpenSort}
        sortActive={tab === "clubs" ? clubSortActive : eventSortActive}
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

      {/* Filter/sort modal — different options per tab */}
      {tab === "clubs" ? (
        <ClubFilters
          visible={filterOpen}
          onClose={handleCloseFilters}
          value={clubFilters}
          onApply={setClubFilters}
          isLocationEnabled={isLocationEnabled}
        />
      ) : (
        <EventFilters
          visible={filterOpen}
          onClose={handleCloseFilters}
          value={eventFilters}
          onApply={setEventFilters}
          isLocationEnabled={isLocationEnabled}
        />
      )}

      {/* Order button sheet — different options per tab */}
      {tab === "clubs" ? (
        <SortSheet
          visible={sortOpen}
          onClose={handleCloseSort}
          options={CLUB_SORT_OPTIONS}
          value={clubFilters.sort}
          onSelect={handleSortSelect}
          radiusKm={clubFilters.radiusKm ?? 10}
          onRadiusKm={handleRadiusChange}
          isLocationEnabled={isLocationEnabled}
          onRequestLocation={requestPermission}
        />
      ) : (
        <SortSheet
          visible={sortOpen}
          onClose={handleCloseSort}
          options={EVENT_SORT_OPTIONS}
          value={eventFilters.sort}
          onSelect={handleSortSelect}
          radiusKm={eventFilters.radiusKm ?? 10}
          onRadiusKm={handleRadiusChange}
          isLocationEnabled={isLocationEnabled}
          onRequestLocation={requestPermission}
        />
      )}
    </SafeScreen>
  );
}

// ---------------------------------------------------------------------------
// Header sub-component (segment + search + view toggle)
// ---------------------------------------------------------------------------

function ExploreHeader({
  tab,
  setTab,
  search,
  setSearch,
  viewMode,
  onToggleViewMode,
  isGridAvailable,
  onOpenFilterModal,
  filterActive,
  onOpenSort,
  sortActive,
}: {
  tab: ExploreTab;
  setTab: (t: ExploreTab) => void;
  search: string;
  setSearch: (s: string) => void;
  viewMode: ViewMode;
  onToggleViewMode: () => void;
  isGridAvailable: boolean;
  onOpenFilterModal: () => void;
  filterActive: boolean;
  onOpenSort: () => void;
  sortActive: boolean;
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

          {/* Filter / sort */}
          <Pressable
            onPress={onOpenFilterModal}
            accessibilityRole="button"
            accessibilityLabel="Filtres et tri"
            className="relative p-2 rounded-full bg-surface dark:bg-surface-dark"
          >
            <Icon
              name="ListFilter"
              size={20}
              color={filterActive ? "primary" : "text-secondary"}
            />
            {filterActive ? (
              <View className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary" />
            ) : null}
          </Pressable>

          {/* Order / sort */}
          <Pressable
            onPress={onOpenSort}
            accessibilityRole="button"
            accessibilityLabel="Trier"
            className="relative p-2 rounded-full bg-surface dark:bg-surface-dark"
          >
            <Icon
              name="ArrowUpDown"
              size={20}
              color={sortActive ? "primary" : "text-secondary"}
            />
            {sortActive ? (
              <View className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary" />
            ) : null}
          </Pressable>

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
    </View>
  );
}
