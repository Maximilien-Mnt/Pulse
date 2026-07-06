import { EventCard } from "@/components/events/EventCard";
import { EventCardGrid } from "@/components/events/EventCardGrid";
import { EventFilters } from "@/components/events/EventFilters";
import { Header } from "@/components/shared/Header";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import type { EventListFilters } from "@/hooks/useEvents";
import { useEvents } from "@/hooks/useEvents";
import { useAuthStore } from "@/stores/authStore";
import { useProfile } from "@/hooks/useProfile";
import type { EventRow } from "@/types";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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
};

export default function EventsScreen() {
  const userId = useAuthStore((s) => s.userId);
  const { data: profile } = useProfile(userId);
  const [filters, setFilters] = useState<EventListFilters>(defaultFilters);
  const [filterOpen, setFilterOpen] = useState(false);
  const [grid, setGrid] = useState(false);
  const { data, isLoading, isError, error, refetch, fetchNextPage, hasNextPage, isFetchingNextPage, isRefetching } =
    useEvents(filters, userId);

  const events = useMemo(() => (data?.pages.flat() ?? []) as EventRow[], [data]);
  const onRefresh = useCallback(() => void refetch(), [refetch]);

  if (isLoading && !data) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-[#0A0F1E]">
        <Header title="Évènements" showAvatar avatarUrl={profile?.avatar_url} />
        <View className="px-4 gap-3">
          <Skeleton height={80} />
          <Skeleton height={80} />
        </View>
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView className="flex-1">
        <ErrorState message={error?.message ?? "Erreur"} onRetry={() => void refetch()} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-[#0A0F1E]" edges={["top"]}>
      <Header title="Évènements" showAvatar avatarUrl={profile?.avatar_url} />
      <View className="px-4 flex-row justify-between py-2">
        <Pressable onPress={() => setFilterOpen(true)}>
          <Ionicons name="funnel-outline" size={24} color="#1E6BFF" />
        </Pressable>
        <Pressable onPress={() => setGrid((g) => !g)}>
          <Ionicons name={grid ? "list-outline" : "grid-outline"} size={24} color="#1E6BFF" />
        </Pressable>
      </View>
      <EventFilters visible={filterOpen} onClose={() => setFilterOpen(false)} value={filters} onApply={setFilters} />
      <FlatList
        key={grid ? "g" : "l"}
        numColumns={grid ? 2 : 1}
        columnWrapperStyle={grid ? { gap: 8, paddingHorizontal: 16 } : undefined}
        data={events}
        keyExtractor={(e) => e.id}
        renderItem={({ item }) =>
          grid ? (
            <EventCardGrid event={item} />
          ) : (
            <View className="px-4">
              <EventCard event={item} />
            </View>
          )
        }
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} />}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
        }}
        ListEmptyComponent={<EmptyState icon="calendar-outline" title="Aucun événement" subtitle="Modifie les filtres." />}
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </SafeAreaView>
  );
}
