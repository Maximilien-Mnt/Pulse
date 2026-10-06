// ---------------------------------------------------------------------------
// PULSE EXPLORE SCREEN
//
// Segmented toggle (Clubs / Événements), search bar, sport chips,
// and responsive list/grid of ClubCard / EventCard components.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  View,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { useBatchFavoriteIds } from "@/hooks/useBatchedFavorites";
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
import { IconButton } from "@/components/ui/IconButton";
import { PressableScale } from "@/components/ui/PressableScale";
import { Tag } from "@/components/ui/Tag";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { ClubCard } from "@/components/explore/ClubCard";
import { EventCard } from "@/components/explore/EventCard";
import { ExploreFilterPanel } from "@/components/explore/ExploreFilterPanel";
import { ExploreSortPanel } from "@/components/explore/ExploreSortPanel";
import { SearchBar } from "@/components/shared/SearchBar";
import { SafeScreen } from "@/components/shared/SafeScreen";
import { useDebounce } from "@/hooks/useDebounce";
import { useFeedLayout } from "@/hooks/useFeedLayout";
import { useTranslation , t } from "@/hooks/useTranslation";

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
        {t("common.noResults")}
      </Text>
      <Text variant="body" className="text-text-secondary text-center">
        {tab === "clubs" ? t("explore.noClubs") : t("explore.noEvents")}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function ExploreScreen() {
  const router = useRouter();
  const { t } = useTranslation();
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

  // The inline filter panel pushes every change here immediately (instant
  // feedback on toggles/pills/fields) while the queries below read the
  // debounced values, so a burst of interactions costs a single refetch.
  const { debouncedValue: clubFiltersQuery } = useDebounce(clubFilters, 700);
  const { debouncedValue: eventFiltersQuery } = useDebounce(eventFilters, 700);
  const { debouncedValue: searchQuery } = useDebounce(search, 700);

  // Effective filters = panel filters overlaid with the quick-access controls
  // (search bar). Location is attached when "nearby" is selected.
  const clubQueryFilters = useMemo<ClubListFilters>(() => ({
    ...clubFiltersQuery,
    sports: clubFiltersQuery.sports,
    location: tab === "clubs" && searchQuery ? searchQuery : clubFiltersQuery.location,
    ...(clubFiltersQuery.sort === "nearby" && latitude !== null && longitude !== null
      ? { userLat: latitude, userLon: longitude }
      : {}),
  }), [clubFiltersQuery, searchQuery, tab, latitude, longitude]);

  const eventQueryFilters = useMemo<EventListFilters>(() => ({
    ...eventFiltersQuery,
    sports: eventFiltersQuery.sports,
    location: tab === "events" && searchQuery ? searchQuery : eventFiltersQuery.location,
    ...(eventFiltersQuery.sort === "nearby" && latitude !== null && longitude !== null
      ? { userLat: latitude, userLon: longitude }
      : {}),
  }), [eventFiltersQuery, searchQuery, tab, latitude, longitude]);

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
      eventFilters.paidOnly !== null ||
      eventFilters.internalOnly ||
      eventFilters.externalOnly ||
      eventFilters.favoritesOnly ||
      eventFilters.sports.length > 0,
    [eventFilters]
  );

  // The filter/sort buttons toggle their inline panel (no modal, no apply
  // step). Opening one closes the other — a single slot under the header.
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

  // Switching segment closes the panels: each tab has its own filter state.
  useEffect(() => {
    setFilterOpen(false);
    setSortOpen(false);
  }, [tab]);

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

  // ── Batched favorite state (one query, not per card) ─────────────────────
  const activeEntityType = tab === "clubs" ? "club" : "event";
  const itemIds = useMemo(() => items.map((item: any) => item.id), [items]);
  const { favoriteIds } = useBatchFavoriteIds(activeEntityType);
  const favLookup = useMemo(() => {
    // NOTE: guard at the crash site — a non-Set (e.g. a deserialized offline
    // cache payload) has no `.has` and would throw inside this memo, taking
    // down the whole screen via the error boundary. The hook itself also
    // normalizes, this is belt + braces at the exact throw location.
    const safeFavoriteIds: ReadonlySet<string> =
      favoriteIds instanceof Set ? favoriteIds : new Set<string>();
    return new Map<string, boolean>(
      items.map((item: any) => [item.id, safeFavoriteIds.has(item.id)]),
    );
  }, [items, favoriteIds]);

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
      const isFav = favLookup.get(item.id) ?? false;
      if (tab === "clubs") {
        return <ClubCard club={item} isCompact={isCompact} grid={isGrid} initialIsFavorite={isFav} />;
      }
      return <EventCard event={item} isCompact={isCompact} grid={isGrid} initialIsFavorite={isFav} />;
    },
    [tab, viewMode, favLookup],
  );

  const keyExtractor = useCallback((item: any) => item.id, []);

  // ------------------------------------------------------------------
  // Loading — only when there is nothing to show yet. A filter change that
  // refetches keeps the panel and the current list mounted.
  // ------------------------------------------------------------------
  if (isLoading && items.length === 0) {
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
        {filterOpen ? (
          <ExploreFilterPanel
            tab={tab}
            clubFilters={clubFilters}
            eventFilters={eventFilters}
            onChangeClubFilters={setClubFilters}
            onChangeEventFilters={setEventFilters}
            onClose={handleCloseFilters}
          />
        ) : null}
        {sortOpen ? (
          <ExploreSortPanel
            options={tab === "clubs" ? CLUB_SORT_OPTIONS : EVENT_SORT_OPTIONS}
            value={tab === "clubs" ? clubFilters.sort : eventFilters.sort}
            onSelect={handleSortSelect}
            radiusKm={
              tab === "clubs"
                ? clubFilters.radiusKm ?? 10
                : eventFilters.radiusKm ?? 10
            }
            onRadiusKm={handleRadiusChange}
            isLocationEnabled={isLocationEnabled}
            onRequestLocation={requestPermission}
            onClose={handleCloseSort}
          />
        ) : null}
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
        {filterOpen ? (
          <ExploreFilterPanel
            tab={tab}
            clubFilters={clubFilters}
            eventFilters={eventFilters}
            onChangeClubFilters={setClubFilters}
            onChangeEventFilters={setEventFilters}
            onClose={handleCloseFilters}
          />
        ) : null}
        {sortOpen ? (
          <ExploreSortPanel
            options={tab === "clubs" ? CLUB_SORT_OPTIONS : EVENT_SORT_OPTIONS}
            value={tab === "clubs" ? clubFilters.sort : eventFilters.sort}
            onSelect={handleSortSelect}
            radiusKm={
              tab === "clubs"
                ? clubFilters.radiusKm ?? 10
                : eventFilters.radiusKm ?? 10
            }
            onRadiusKm={handleRadiusChange}
            isLocationEnabled={isLocationEnabled}
            onRequestLocation={requestPermission}
            onClose={handleCloseSort}
          />
        ) : null}
        <View className="flex-1 items-center justify-center px-8">
          <Icon name="Search" size={32} color="text-tertiary" />
          <Text variant="subtitle" className="text-text-primary mt-4 mb-2 text-center">
            {t("common.loadingError")}
          </Text>
          <Button variant="secondary" onPress={() => void refetch()}>
            {t("common.retry")}
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

      {/* Inline filter panel — right under the header, above the list */}
      {filterOpen ? (
        <ExploreFilterPanel
          tab={tab}
          clubFilters={clubFilters}
          eventFilters={eventFilters}
          onChangeClubFilters={setClubFilters}
          onChangeEventFilters={setEventFilters}
          onClose={handleCloseFilters}
        />
      ) : null}

      {/* Inline sort panel — same design/logic as the filter panel */}
      {sortOpen ? (
        <ExploreSortPanel
          options={tab === "clubs" ? CLUB_SORT_OPTIONS : EVENT_SORT_OPTIONS}
          value={tab === "clubs" ? clubFilters.sort : eventFilters.sort}
          onSelect={handleSortSelect}
          radiusKm={
            tab === "clubs"
              ? clubFilters.radiusKm ?? 10
              : eventFilters.radiusKm ?? 10
          }
          onRadiusKm={handleRadiusChange}
          isLocationEnabled={isLocationEnabled}
          onRequestLocation={requestPermission}
          onClose={handleCloseSort}
        />
      ) : null}

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
              {t("common.events")}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Search bar + View toggle */}
      <View className="px-4 pb-2">
        <View className="flex-row items-center gap-2">
          <View className="flex-1">
            <SearchBar
              value={search}
              onChangeText={setSearch}
              onClear={() => setSearch("")}
              expanded
              autoFocus={false}
              placeholder={
                tab === "clubs"
                  ? t("explore.searchClub")
                  : t("events.searchPlaceholder")
              }
            />
          </View>

          {/* Filter / sort / view: each carries an "active" dot or uses the
              active-state icon colour, so they keep children and stay
              <PressableScale>. Motion + surface classes are copied verbatim
              from <IconButton tone="neutral"> so the row animates as one
              system (components/ui/IconButton.tsx). */}
          <PressableScale
            onPress={onOpenFilterModal}
            scaleOnPress={0.9}
            scaleOnHover={1.06}
            accessibilityRole="button"
            accessibilityLabel={t("explore.filtersSort")}
            className="relative w-11 h-11 rounded-full items-center justify-center shrink-0 bg-neutral-100 dark:bg-neutral-800 active:bg-neutral-200 dark:active:bg-neutral-700 transition-colors duration-150"
          >
            <Icon
              name="ListFilter"
              size={20}
              color={filterActive ? "primary" : "text-secondary"}
            />
            {filterActive ? (
              <View className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary" />
            ) : null}
          </PressableScale>

          {/* Order / sort */}
          <PressableScale
            onPress={onOpenSort}
            scaleOnPress={0.9}
            scaleOnHover={1.06}
            accessibilityRole="button"
            accessibilityLabel={t("explore.sort")}
            className="relative w-11 h-11 rounded-full items-center justify-center shrink-0 bg-neutral-100 dark:bg-neutral-800 active:bg-neutral-200 dark:active:bg-neutral-700 transition-colors duration-150"
          >
            <Icon
              name="ArrowUpDown"
              size={20}
              color={sortActive ? "primary" : "text-secondary"}
            />
            {sortActive ? (
              <View className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary" />
            ) : null}
          </PressableScale>

          {/* View mode toggle */}
          {isGridAvailable ? (
            <IconButton
              icon={viewMode === "list" ? "LayoutGrid" : "List"}
              iconSize={20}
              size="md"
              tone="neutral"
              label={
                viewMode === "list" ? t("common.viewList") : t("common.viewGrid")
              }
              onPress={onToggleViewMode}
            />
          ) : null}
        </View>
      </View>
    </View>
  );
}
