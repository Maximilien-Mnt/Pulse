import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";

// ---------------------------------------------------------------------------
// Shared optimistic favorite toggle for clubs & events.
//
// Derives `nextIsFavorite` from the cached current boolean, not from an
// assumption that every mutation is an add. Updates the count by +1 for add
// and -1 for remove, never below zero. Cancels matching queries before the
// optimistic update, snapshots the previous values and rolls back on error,
// and invalidates/refetches the matching detail/list queries after settlement.
// ---------------------------------------------------------------------------

type EntityType = "club" | "event";

interface UseToggleFavoriteOptions {
  entityType: EntityType;
  id: string;
  /** Override the default query-key prefix (used by explore cards). */
  queryKeyPrefix?: string;
  /** When true a count query is managed and optimistic count deltas are applied. */
  includeCount?: boolean;
  /**
   * When provided, the `isFavorited` read query is skipped (enabled: false) and
   * this value is used instead.  The cache is seeded with this value so
   * optimistic updates in `onMutate` work correctly.
   *
   * Use this when the parent container has already fetched the favorite state
   * via a batched query (e.g. `useBatchFavoriteIds`) and passes it down as a
   * prop — this avoids one per-card network request on list screens.
   */
  initialIsFavorite?: boolean;
  /**
   * When provided, the `favCount` read query is skipped (enabled: false) and
   * this value is used instead.  The cache is seeded with this value so
   * optimistic count deltas in `onMutate` work correctly.
   *
   * Use this when the parent container has already fetched counts via a batched
   * query (e.g. `useBatchFavoriteCounts`) and passes them down as props.
   */
  initialFavCount?: number;
  /** Extra query keys to invalidate on settlement (e.g. detail screen keys). */
  extraInvalidationKeys?: Array<string | string[]>;
}

interface UseToggleFavoriteResult {
  isFavorited: boolean | undefined;
  favCount: number | undefined;
  isLoading: boolean;
  isPending: boolean;
  error: unknown;
  toggle: () => void;
}

function favoriteTableName(entityType: EntityType): string {
  return entityType === "club" ? "club_favorites" : "event_favorites";
}

function favoriteColumn(entityType: EntityType): string {
  return entityType === "club" ? "club_id" : "event_id";
}

function defaultQueryKeyPrefix(entityType: EntityType): string {
  return entityType === "club" ? "club-favorite" : "event-favorite";
}

function isFavQueryKey(prefix: string, id: string): readonly [string, string] {
  return [prefix, id] as const;
}

function countQueryKey(prefix: string, id: string): readonly [string, string] {
  return [`${prefix}s-count`, id] as const;
}

function listInvalidationKey(entityType: EntityType): readonly string[] {
  return entityType === "club" ? ["clubs"] : ["events"];
}

export function useToggleFavorite({
  entityType,
  id,
  queryKeyPrefix,
  includeCount = true,
  initialIsFavorite,
  initialFavCount,
  extraInvalidationKeys = [],
}: UseToggleFavoriteOptions): UseToggleFavoriteResult {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.userId);

  const prefix = queryKeyPrefix ?? defaultQueryKeyPrefix(entityType);
  const table = favoriteTableName(entityType);
  const col = favoriteColumn(entityType);
  const favKey: readonly [string, string] = isFavQueryKey(prefix, id);
  const countKey: readonly [string, string] | null =
    includeCount ? countQueryKey(prefix, id) : null;

  // ── Determine whether to skip read-side queries (batched parent provided data) ──
  const skipFavQuery = initialIsFavorite !== undefined;
  const skipCountQuery = includeCount && initialFavCount !== undefined;

  // Seed cache with initial values so optimistic updates work correctly.
  if (skipFavQuery) {
    queryClient.setQueryData(favKey, initialIsFavorite);
  }
  if (skipCountQuery && countKey) {
    queryClient.setQueryData(countKey, initialFavCount);
  }

  // ── isFavorited query ──────────────────────────────────────────────────
  const { data: isFavorited, isLoading: isLoadingFav, refetch: refetchFav } =
    useQuery({
      queryKey: favKey,
      queryFn: async () => {
        if (!userId) return false;
        const { data, error } = await supabase
          .from(table as any)
          .select(col as any)
          .eq("user_id", userId)
          .eq(col, id)
          .maybeSingle();
        if (error) throw error;
        return !!data;
      },
      enabled: !!userId && !!id && !skipFavQuery,
      staleTime: 5000,
    });

  // ── favCount query ──────────────────────────────────────────────────────
  const { data: favCountQueryData, isLoading: isLoadingCount, refetch: refetchCount } = useQuery({
    queryKey: countKey!,
    queryFn: async () => {
      if (!userId) return 0;
      const { count, error } = await supabase
        .from(table as any)
        .select(col as any, { count: "exact", head: true })
        .eq(col, id);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!userId && !!id && !skipCountQuery && includeCount,
  });

  const favCountRaw =
    skipCountQuery || !includeCount
      ? initialFavCount ?? undefined
      : favCountQueryData ?? 0;

  const favCount = includeCount ? (favCountRaw ?? 0) : undefined;

  // ── Mutation with correct optimistic logic ─────────────────────────────
  const mutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("auth");
      const { data: existing } = await supabase
        .from(table as any)
        .select(col as any)
        .eq("user_id", userId)
        .eq(col, id)
        .maybeSingle();
      if (existing) {
        const { error } = await supabase
          .from(table as any)
          .delete()
          .eq("user_id", userId)
          .eq(col, id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(table as any).insert({
          user_id: userId,
          [col]: id,
        });
        if (error) throw error;
      }
    },
    onMutate: async () => {
      // Cancel in-flight queries for the keys we are about to overwrite.
      await queryClient.cancelQueries({ queryKey: favKey });
      if (countKey) {
        await queryClient.cancelQueries({ queryKey: countKey });
      }
      for (const key of extraInvalidationKeys) {
        await queryClient.cancelQueries({ queryKey: key as unknown as readonly unknown[] });
      }

      const prevIsFav = queryClient.getQueryData<boolean | undefined>(favKey);
      const prevCount =
        countKey != null
          ? (queryClient.getQueryData<number | undefined>(countKey) ?? 0)
          : undefined;

      // Derive the next state from the cached current value.
      const currentlyFav = !!(prevIsFav ?? false);
      const nextIsFav = !currentlyFav;
      const nextCount =
        countKey != null
          ? Math.max(0, (prevCount ?? 0) + (nextIsFav ? 1 : -1))
          : undefined;

      queryClient.setQueryData(favKey, nextIsFav);
      if (countKey) {
        queryClient.setQueryData(countKey, nextCount);
      }

      return { prevIsFav, prevCount };
    },
    onError: (_err, _vars, context) => {
      if (context == null) return;
      queryClient.setQueryData(favKey, context.prevIsFav);
      if (countKey) {
        queryClient.setQueryData(countKey, context.prevCount);
      }
      // Re-run the readonly queries so the UI reflects the real state.
      void refetchFav();
      if (countKey) {
        void refetchCount();
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: favKey });
      if (countKey) {
        void queryClient.invalidateQueries({ queryKey: countKey });
      }
      for (const key of listInvalidationKey(entityType)) {
        void queryClient.invalidateQueries({ queryKey: key as unknown as readonly unknown[] });
      }
      for (const key of extraInvalidationKeys) {
        void queryClient.invalidateQueries({ queryKey: key as unknown as readonly unknown[] });
      }
    },
  });

  // ── Guard against duplicate calls while a mutation is in flight. ───────
  const calledRef = useRef(false);
  const toggle = useCallback(() => {
    if (!userId || !id || mutation.isPending || calledRef.current) return;
    calledRef.current = true;
    mutation.mutate(undefined, {
      onSettled: () => {
        calledRef.current = false;
      },
    });
  }, [userId, id, mutation.isPending, mutation.mutate]);

  return {
    isFavorited: isFavorited ?? false,
    favCount,
    isLoading: isLoadingFav || (includeCount && !skipCountQuery ? isLoadingCount : false),
    isPending: mutation.isPending,
    error: mutation.error,
    toggle,
  };
}



