import { ClubCard } from "@/components/clubs/ClubCard";
import { EventCard } from "@/components/events/EventCard";
import { ClubCardGrid } from "@/components/clubs/ClubCardGrid";
import { EventCardGrid } from "@/components/events/EventCardGrid";
import { ClubFilters } from "@/components/clubs/ClubFilters";
import { EventFilters } from "@/components/events/EventFilters";
import { Header } from "@/components/shared/Header";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useClubs } from "@/hooks/useClubs";
import { useEvents } from "@/hooks/useEvents";
import { useLocation } from "@/hooks/useLocation";
import { useAuthStore } from "@/stores/authStore";
import { useProfile } from "@/hooks/useProfile";
import type { Club, EventRow } from "@/types";
import type { ClubListFilters } from "@/hooks/useClubs";
import type { EventListFilters } from "@/hooks/useEvents";
import { Icon } from "@/components/ui/Icon";
import { useCallback, useMemo, useState } from "react";
import { Pressable, RefreshControl, View, Text } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { SafeScreen } from "@/components/shared/SafeScreen";
import { t } from "@/hooks/useTranslation";

type DiscoverMode = "clubs" | "events";

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

export default function DiscoverScreen() {
  const userId = useAuthStore((s) => s.userId);
  const { data: profile } = useProfile(userId);
  const { latitude, longitude, isLocationEnabled, requestPermission } = useLocation();
  const [mode, setMode] = useState<DiscoverMode>("clubs");
  const [filterOpen, setFilterOpen] = useState(false);
  const [grid, setGrid] = useState(false);
  const [clubFilters, setClubFilters] = useState<ClubListFilters>(defaultClubFilters);
  const [eventFilters, setEventFilters] = useState<EventListFilters>(defaultEventFilters);

  // Add location to filters when available
  const clubFiltersWithLocation = useMemo(() => {
    if (clubFilters.sort === "nearby" && latitude && longitude) {
      return { ...clubFilters, userLat: latitude, userLon: longitude };
    }
    return clubFilters;
  }, [clubFilters, latitude, longitude]);

  const eventFiltersWithLocation = useMemo(() => {
    if (eventFilters.sort === "nearby" && latitude && longitude) {
      return { ...eventFilters, userLat: latitude, userLon: longitude };
    }
    return eventFilters;
  }, [eventFilters, latitude, longitude]);

  const {
    data: clubsData,
    isLoading: clubsLoading,
    isError: clubsError,
    error: clubsErrorObj,
    refetch: refetchClubs,
    fetchNextPage: fetchNextClubs,
    hasNextPage: hasNextClubs,
    isFetchingNextPage: isFetchingNextClubs,
    isRefetching: isRefetchingClubs,
  } = useClubs(clubFiltersWithLocation, userId);

  const {
    data: eventsData,
    isLoading: eventsLoading,
    isError: eventsError,
    error: eventsErrorObj,
    refetch: refetchEvents,
    fetchNextPage: fetchNextEvents,
    hasNextPage: hasNextEvents,
    isFetchingNextPage: isFetchingNextEvents,
    isRefetching: isRefetchingEvents,
  } = useEvents(eventFiltersWithLocation, userId);

  const clubs = useMemo(() => (clubsData?.pages.flat() ?? []) as Club[], [clubsData]);
  const events = useMemo(() => (eventsData?.pages.flat() ?? []) as EventRow[], [eventsData]);

  const clubsListLoading = clubsLoading && !clubs.length;
  const eventsListLoading = eventsLoading && !events.length;

  const clubsListError = clubsError ? clubsErrorObj : undefined;
  const eventsListError = eventsError ? eventsErrorObj : undefined;

  return (
    <SafeScreen className="flex-1 bg-neutral-50 dark:bg-[#0A0F1E]" edges={["top"]}>
      <Header title={t("common.discover")} showAvatar avatarUrl={profile?.avatar_url} />
      
      {/* Mode Switcher */}
      <View className="flex-row mx-4 mb-2 bg-neutral-200 dark:bg-neutral-800 rounded-xl p-1">
        {(["clubs", "events"] as DiscoverMode[]).map((m) => (
          <Pressable
            key={m}
            onPress={() => setMode(m)}
            className={`flex-1 py-2 rounded-lg items-center ${
              mode === m ? "bg-white dark:bg-neutral-900" : ""
            }`}
          >
            <Text
              className={`font-semibold ${
                mode === m ? "text-primary" : "text-neutral-500"
              }`}
            >
              {m === "clubs" ? t("common.clubs") : t("common.events")}
            </Text>
          </Pressable>
        ))}
      </View>

      <View className="px-4 flex-row justify-between py-2">
        <Pressable onPress={() => setFilterOpen(true)}>
          <Icon name="Funnel" size={24} color="primary" />
        </Pressable>
        <Pressable onPress={() => setGrid((g) => !g)}>
          <Icon name={grid ? "List" : "LayoutGrid"} size={24} color="primary" />
        </Pressable>
      </View>

      {mode === "clubs" ? (
        <ClubFilters
          visible={filterOpen}
          onClose={() => setFilterOpen(false)}
          value={clubFilters}
          onApply={setClubFilters}
          isLocationEnabled={isLocationEnabled}
        />
      ) : (
        <EventFilters
          visible={filterOpen}
          onClose={() => setFilterOpen(false)}
          value={eventFilters}
          onApply={setEventFilters}
          isLocationEnabled={isLocationEnabled}
        />
      )}

      {mode === "clubs" && (
        <>
          {clubsListLoading ? (
            <View className="px-4 gap-3">
              <Skeleton height={80} />
              <Skeleton height={80} />
            </View>
          ) : clubsListError ? (
            <ErrorState message={clubsListError?.message ?? t("common.error")} onRetry={() => void refetchClubs()} />
          ) : (
            <FlashList
              key="clubs-list"
              numColumns={grid ? 2 : 1}
              data={clubs}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View className={grid ? "px-1" : "px-4"}>
                  {grid ? <ClubCardGrid club={item} /> : <ClubCard club={item} />}
                </View>
              )}
              refreshControl={<RefreshControl refreshing={isRefetchingClubs} onRefresh={refetchClubs} />}
              onEndReachedThreshold={0.5}
              onEndReached={() => {
                if (hasNextClubs && !isFetchingNextClubs) void fetchNextClubs();
              }}
              ListEmptyComponent={
                <EmptyState
                  icon="Users"
                  title={t("common.noClub")}
                  subtitle={t("common.tryOtherFilters")}
                />
              }
              contentContainerStyle={{ paddingBottom: 24, paddingHorizontal: grid ? 12 : 0 }}
            />
          )}
        </>
      )}

      {mode === "events" && (
        <>
          {eventsListLoading ? (
            <View className="px-4 gap-3">
              <Skeleton height={80} />
              <Skeleton height={80} />
            </View>
          ) : eventsListError ? (
            <ErrorState message={eventsListError?.message ?? t("common.error")} onRetry={() => void refetchEvents()} />
          ) : (
            <FlashList
              key="events-list"
              numColumns={grid ? 2 : 1}
              data={events}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View className={grid ? "px-1" : "px-4"}>
                  {grid ? <EventCardGrid event={item} /> : <EventCard event={item} />}
                </View>
              )}
              refreshControl={<RefreshControl refreshing={isRefetchingEvents} onRefresh={refetchEvents} />}
              onEndReachedThreshold={0.5}
              onEndReached={() => {
                if (hasNextEvents && !isFetchingNextEvents) void fetchNextEvents();
              }}
              ListEmptyComponent={
                <EmptyState
                  icon="Calendar"
                  title={t("common.noEvents")}
                  subtitle={t("common.tryOtherFilters")}
                />
              }
              contentContainerStyle={{ paddingBottom: 24, paddingHorizontal: grid ? 12 : 0 }}
            />
          )}
        </>
      )}
    </SafeScreen>
  );
}