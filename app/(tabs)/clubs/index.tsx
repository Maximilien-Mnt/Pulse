import { ClubCard } from "@/components/clubs/ClubCard";
import { ClubCardGrid } from "@/components/clubs/ClubCardGrid";
import { ClubFilters } from "@/components/clubs/ClubFilters";
import { Header } from "@/components/shared/Header";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import type { ClubListFilters } from "@/hooks/useClubs";
import { useClubs } from "@/hooks/useClubs";
import { useAuthStore } from "@/stores/authStore";
import { useProfile } from "@/hooks/useProfile";
import type { Club } from "@/types";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const defaultFilters: ClubListFilters = {
  sports: [],
  location: "",
  requiredLevel: "",
  internalOnly: false,
  externalOnly: false,
  favoritesOnly: false,
  sort: "relevance",
};

export default function ClubsScreen() {
  const userId = useAuthStore((s) => s.userId);
  const { data: profile } = useProfile(userId);
  const [filters, setFilters] = useState<ClubListFilters>(defaultFilters);
  const [filterOpen, setFilterOpen] = useState(false);
  const [grid, setGrid] = useState(false);
  const { data, isLoading, isError, error, refetch, fetchNextPage, hasNextPage, isFetchingNextPage, isRefetching } =
    useClubs(filters, userId);

  const clubs = useMemo(() => (data?.pages.flat() ?? []) as Club[], [data]);

  const onRefresh = useCallback(() => void refetch(), [refetch]);

  if (isLoading && !data) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-[#0A0F1E]">
        <Header title="Clubs" showAvatar avatarUrl={profile?.avatar_url} />
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
      <Header title="Clubs" showAvatar avatarUrl={profile?.avatar_url} />
      <View className="px-4 flex-row justify-between items-center py-2">
        <Pressable onPress={() => setFilterOpen(true)}>
          <Ionicons name="funnel-outline" size={24} color="#1E6BFF" />
        </Pressable>
        <Pressable onPress={() => setGrid((g) => !g)}>
          <Ionicons name={grid ? "list-outline" : "grid-outline"} size={24} color="#1E6BFF" />
        </Pressable>
      </View>
      <ClubFilters visible={filterOpen} onClose={() => setFilterOpen(false)} value={filters} onApply={setFilters} />
      <FlatList
        key={grid ? "g" : "l"}
        numColumns={grid ? 2 : 1}
        columnWrapperStyle={grid ? { gap: 8, paddingHorizontal: 16 } : undefined}
        data={clubs}
        keyExtractor={(c) => c.id}
        renderItem={({ item }) =>
          grid ? (
            <ClubCardGrid club={item} />
          ) : (
            <View className="px-4">
              <ClubCard club={item} />
            </View>
          )
        }
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} />}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
        }}
        ListEmptyComponent={<EmptyState icon="people-outline" title="Aucun club" subtitle="Essaie d’autres filtres." />}
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </SafeAreaView>
  );
}
