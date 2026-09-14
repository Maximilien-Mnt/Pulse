import { EventCard } from "@/components/events/EventCard";
import { EventCardGrid } from "@/components/events/EventCardGrid";
import { EventFilters } from "@/components/events/EventFilters";
import { EventsListEmpty, EventsListError, EventsListFooterLoading, EventsListRefreshing, EventsListSkeleton } from "@/components/events/EventsStates";
import { Header } from "@/components/shared/Header";
import type { EventListFilters } from "@/hooks/useEvents";
import { useEvents } from "@/hooks/useEvents";
import { useLocation } from "@/hooks/useLocation";
import { useResponsiveListGrid } from "@/hooks/useResponsiveListGrid";
import { useAuthStore } from "@/stores/authStore";
import { useProfile } from "@/hooks/useProfile";
import type { EventRow } from "@/types";
import { Icon } from "@/components/ui/Icon";
import { useTranslation } from "@/hooks/useTranslation";
import { isNetworkError } from "@/utils/isNetworkError";
import { logQueryError } from "@/utils/logQueryError";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, RefreshControl, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { SafeScreen } from "@/components/shared/SafeScreen";
import { useBatchFavoriteIds, useBatchFavoriteCounts } from "@/hooks/useBatchedFavorites";


const defaultFilters: EventListFilters = {
  sports: [],
  location: "",
  dateFrom: null,
  dateTo: null,
  requiredLevel: "",
  difficultyMin: 1,
  difficultyMax: 5,
  category: "",
  paidOnly: null,
  internalOnly: false,
  externalOnly: false,
  favoritesOnly: false,
  sort: "date_asc",
  radiusKm: 10,
};

export default function EventsScreen() {
  const { t } = useTranslation();
  const userId = useAuthStore((s) => s.userId);
  const { data: profile } = useProfile(userId);
  const { latitude, longitude, isLocationEnabled, requestPermission } = useLocation();
  const [filters, setFilters] = useState<EventListFilters>(defaultFilters);
  const [filterOpen, setFilterOpen] = useState(false);
  const { grid, setGrid, columns, showViewToggle } = useResponsiveListGrid();

  // Add location to filters when available
  const filtersWithLocation = useMemo(() => {
    if (filters.sort === "nearby" && latitude && longitude) {
      return { ...filters, userLat: latitude, userLon: longitude };
    }
    return filters;
  }, [filters, latitude, longitude]);

  const {
    data,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isRefetching,
  } = useEvents(filtersWithLocation, userId);

  const events = useMemo(() => (data?.pages.flat() ?? []) as EventRow[], [data]);

  // Whether any filter deviates from the defaults (drives the empty-state CTA).
  const hasActiveFilters = useMemo(
    () =>
      filters.sports.length > 0 ||
      filters.location.trim() !== "" ||
      filters.dateFrom != null ||
      filters.dateTo != null ||
      filters.requiredLevel.trim() !== "" ||
      filters.difficultyMin !== defaultFilters.difficultyMin ||
      filters.difficultyMax !== defaultFilters.difficultyMax ||
      filters.category.trim() !== "" ||
      filters.paidOnly != null ||
      filters.internalOnly ||
      filters.externalOnly ||
      filters.favoritesOnly ||
      filters.sort !== defaultFilters.sort,
    [filters],
  );

  const clearFilters = useCallback(() => setFilters(defaultFilters), []);

  // Safe, PII-free diagnostics for initial load failures (UI stays non-technical).
  useEffect(() => {
    if (isError) logQueryError("events-list", error);
  }, [isError, error]);

  const offline = isError && isNetworkError(error);

  // ── Batched favorite state (one query per entity type, not per card) ──────
  const eventIds = useMemo(() => events.map((e) => e.id), [events]);
  const { favoriteIds } = useBatchFavoriteIds("event");
  const { counts: favCounts } = useBatchFavoriteCounts("event", eventIds);

  // Memoize per-event favorite lookups.
  const eventFavLookup = useMemo(
    () =>
      new Map<string, { isFavorite: boolean; favCount: number }>(
        events.map((e) => [
          e.id,
          {
            isFavorite: favoriteIds.has(e.id),
            favCount: favCounts.get(e.id) ?? 0,
          },
        ]),
      ),
    [events, favoriteIds, favCounts],
  );

  const onRefresh = useCallback(() => void refetch(), [refetch]);

  // Background refresh with cached data: keep the list on screen.
  const showStaleRefreshing = !isLoading && !!data && (isRefetching || isFetching) && events.length > 0;

  // Initial loading: layout-matching skeleton (structure is known), never a
  // full-screen spinner.
  if (isLoading && !data) {
    return (
      <SafeScreen className="flex-1 bg-bg dark:bg-bg-dark">
        <Header title={t("common.events")} showAvatar avatarUrl={profile?.avatar_url} />
        <EventsListSkeleton grid={grid} />
      </SafeScreen>
    );
  }

  // Initial error (nothing cached): localized non-technical message + retry.
  if (isError && !data) {
    return (
      <SafeScreen className="flex-1 bg-bg dark:bg-bg-dark">
        <Header title={t("common.events")} showAvatar avatarUrl={profile?.avatar_url} />
        <EventsListError offline={offline} onRetry={() => void refetch()} />
      </SafeScreen>
    );
  }

  return (
    <SafeScreen className="flex-1 bg-bg dark:bg-bg-dark" edges={["top"]}>
      <Header title={t("common.events")} showAvatar avatarUrl={profile?.avatar_url} />
      <View className="px-4 flex-row justify-between py-2">
        <Pressable onPress={() => setFilterOpen(true)}>
          <Icon name="Funnel" size={24} color="primary" />
        </Pressable>
        {showViewToggle ? (
          <Pressable onPress={() => setGrid((g) => !g)}>
            <Icon name={grid ? "List" : "LayoutGrid"} size={24} color="primary" />
          </Pressable>
        ) : null}
      </View>
      <EventFilters visible={filterOpen} onClose={() => setFilterOpen(false)} value={filters} onApply={setFilters} isLocationEnabled={isLocationEnabled} />
      {/* Refreshing with content preserved: inline progress, list stays mounted. */}
      {showStaleRefreshing ? <EventsListRefreshing /> : null}
      {/* Error with cached data: keep content (no data loss), offer inline retry. */}
      {isError && data ? (
        <View className="mx-4 mb-2" testID="events-list-inline-error">
          <EventsListError offline={offline} onRetry={() => void refetch()} inline />
        </View>
      ) : null}
      <FlashList
        key={grid ? "g" : "l"}
        numColumns={grid ? columns : 1}
        data={events}
        keyExtractor={(e) => e.id}
        renderItem={({ item }) => {
          const fav = eventFavLookup.get(item.id) ?? { isFavorite: false, favCount: 0 };
          return grid ? (
            <View className="px-1">
              <EventCardGrid event={item} initialIsFavorite={fav.isFavorite} initialFavCount={fav.favCount} />
            </View>
          ) : (
            <View>
              <EventCard event={item} compact initialIsFavorite={fav.isFavorite} initialFavCount={fav.favCount} />
            </View>
          );
        }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} />}
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
        }}
        ListFooterComponent={isFetchingNextPage ? <EventsListFooterLoading /> : null}
        ListEmptyComponent={
          isLoading || isError ? null : (
            <EventsListEmpty hasActiveFilters={hasActiveFilters} onClearFilters={clearFilters} />
          )
        }
        contentContainerStyle={{ paddingBottom: 24, paddingHorizontal: grid ? 12 : 0 }}
      />

    </SafeScreen>
  );
}
