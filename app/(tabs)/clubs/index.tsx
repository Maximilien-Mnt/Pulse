import { ClubCard } from "@/components/clubs/ClubCard";
import { ClubCardGrid } from "@/components/clubs/ClubCardGrid";
import { ClubFilters } from "@/components/clubs/ClubFilters";
import { Header } from "@/components/shared/Header";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import type { ClubListFilters } from "@/hooks/useClubs";
import { useClubs } from "@/hooks/useClubs";
import { useLocation } from "@/hooks/useLocation";
import { useResponsiveListGrid } from "@/hooks/useResponsiveListGrid";
import { useAuthStore } from "@/stores/authStore";
import { useProfile } from "@/hooks/useProfile";
import { useTranslation , t } from "@/hooks/useTranslation";
import type { Club } from "@/types";
import { Icon } from "@/components/ui/Icon";
import { useCallback, useMemo, useState } from "react";
import { Pressable, RefreshControl, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { SafeScreen } from "@/components/shared/SafeScreen";


const defaultFilters: ClubListFilters = {
  sports: [],
  location: "",
  requiredLevel: "",
  internalOnly: false,
  externalOnly: false,
  favoritesOnly: false,
  sort: "relevance",
  radiusKm: 10,
};

export default function ClubsScreen() {
  const { t } = useTranslation();
  const userId = useAuthStore((s) => s.userId);
  const { data: profile } = useProfile(userId);
  const { latitude, longitude, isLocationEnabled, requestPermission } = useLocation();
  const [filters, setFilters] = useState<ClubListFilters>(defaultFilters);
  const [filterOpen, setFilterOpen] = useState(false);
  const { grid, setGrid, columns, showViewToggle } = useResponsiveListGrid();

  // Add location to filters when available
  const filtersWithLocation = useMemo(() => {
    if (filters.sort === "nearby" && latitude && longitude) {
      return { ...filters, userLat: latitude, userLon: longitude };
    }
    return filters;
  }, [filters, latitude, longitude]);
  
  const { data, isLoading, isError, error, refetch, fetchNextPage, hasNextPage, isFetchingNextPage, isRefetching } =
    useClubs(filtersWithLocation, userId);

  const clubs = useMemo(() => (data?.pages.flat() ?? []) as Club[], [data]);

  const onRefresh = useCallback(() => void refetch(), [refetch]);

  const handleSortChange = useCallback((newSort: string) => {
    if (newSort === "nearby" && !isLocationEnabled) {
      requestPermission();
    }
    setFilters((f) => ({ ...f, sort: newSort }));
  }, [isLocationEnabled, requestPermission]);

  if (isLoading && !data) {
    return (
      <SafeScreen className="flex-1 bg-neutral-50 dark:bg-[#0A0F1E]">
        <Header title={t("common.clubs")} showAvatar avatarUrl={profile?.avatar_url} />
        <View className="px-4 gap-3">
          <Skeleton height={80} />
          <Skeleton height={80} />
        </View>
      </SafeScreen>
    );
  }

  if (isError) {
    return (
      <SafeScreen className="flex-1">
        <ErrorState message={error?.message ?? t("common.error")} onRetry={() => void refetch()} />
      </SafeScreen>
    );
  }

  return (
    <SafeScreen className="flex-1 bg-neutral-50 dark:bg-[#0A0F1E]" edges={["top"]}>
      <Header title={t("common.clubs")} showAvatar avatarUrl={profile?.avatar_url} />
      <View className="px-4 flex-row justify-between items-center py-2">
        <Pressable onPress={() => setFilterOpen(true)}>
          <Icon name="Funnel" size={24} color="primary" />
        </Pressable>
        {showViewToggle ? (
          <Pressable onPress={() => setGrid((g) => !g)}>
            <Icon name={grid ? "List" : "LayoutGrid"} size={24} color="primary" />
          </Pressable>
        ) : null}
      </View>
      <ClubFilters 
        visible={filterOpen} 
        onClose={() => setFilterOpen(false)} 
        value={filters} 
        onApply={setFilters}
        isLocationEnabled={isLocationEnabled}
      />
      <FlashList
        key={grid ? "g" : "l"}
        numColumns={grid ? columns : 1}
        data={clubs}
        keyExtractor={(c) => c.id}
        renderItem={({ item }) =>
          grid ? (
            <View className="px-1">
              <ClubCardGrid club={item} />
            </View>
          ) : (
            <View>
              <ClubCard club={item} compact />
            </View>
          )
        }
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} />}
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
        }}
        ListEmptyComponent={<EmptyState icon="Users" title={t("common.noClub")} subtitle={t("common.tryOtherFilters")} />}
        contentContainerStyle={{ paddingBottom: 24, paddingHorizontal: grid ? 12 : 0 }}
      />

    </SafeScreen>
  );
}
