import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";

// ---------------------------------------------------------------------------
// Batched favorite queries for list screens.
//
// Two single-request helpers that replace the per-card N+1 pattern:
//   1. useBatchFavoriteIds  – which entity IDs are favorited by the current user
//   2. useBatchFavoriteCounts – total favorite count for each visible entity ID
//
// Both fire exactly ONE Supabase request regardless of list size.  The per-card
// useToggleFavorite hook is kept for mutation + detail-screen reads; list cards
// pass initial* props so their read-side queries stay disabled.
// ---------------------------------------------------------------------------

export type EntityType = "club" | "event";

// ── Schema helpers ──────────────────────────────────────────────────────────

function favoriteTableName(type: EntityType): string {
  return type === "club" ? "club_favorites" : "event_favorites";
}

function entityIdColumn(type: EntityType): string {
  return type === "club" ? "club_id" : "event_id";
}

// ── Query keys (include entity type + user id where required) ───────────────

/** Key for the batched "which IDs does the current user favorited?" query. */
export function batchFavoriteIdsKey(
  type: EntityType,
  userId: string,
): readonly [string, EntityType, string] {
  return ["batch-favorite-ids", type, userId] as const;
}

/**
 * Key for the batched "total favorite count per entity ID" query.
 * Entity IDs are sorted so that the same logical set always produces the same
 * key regardless of the order the list hook returned them in.
 */
export function batchFavoriteCountsKey(
  type: EntityType,
  entityIds: readonly string[],
): readonly [string, EntityType, string] {
  const sorted = [...entityIds].sort();
  return ["batch-favorite-counts", type, sorted.join(",")] as const;
}

// ── Hook 1: batched favorite IDs for the current user ──────────────────────

interface UseBatchFavoriteIdsResult {
  /** Set of entity IDs that the current user has favorited. Empty when offline / unauth. */
  favoriteIds: ReadonlySet<string>;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
}

/**
 * Fires a single `SELECT … FROM {favs} WHERE user_id = ?` and returns the
 * result as a `Set` for O(1) lookup.  Cache is keyed by entity type + user id
 * so it survives across list re-renders and pagination.
 */
export function useBatchFavoriteIds(
  type: EntityType,
): UseBatchFavoriteIdsResult {
  const userId = useAuthStore((s) => s.userId);

  const key = userId ? batchFavoriteIdsKey(type, userId) : null;

  const query = useQuery({
    queryKey: key!,
    queryFn: async () => {
      if (!userId) return new Set<string>();
      const { data, error } = await supabase
        .from(favoriteTableName(type) as any)
        .select(entityIdColumn(type) as any)
        .eq("user_id", userId);
      if (error) throw error;
      return new Set(
        (data ?? []).map((r: any) => r[entityIdColumn(type)] as string),
      );
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    placeholderData: () => new Set<string>(),
  });

  return {
    favoriteIds: query.data ?? new Set<string>(),
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}

// ── Hook 2: batched favorite counts for the visible entity IDs ─────────────

interface UseBatchFavoriteCountsResult {
  /** entityId → total number of users who favorited it. Empty when no IDs given. */
  counts: ReadonlyMap<string, number>;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
}

/**
 * Fires a single `SELECT entity_id FROM {favs} WHERE entity_id IN (…)` and
 * aggregates the row count per entity client-side.  Because the PK of the
 * favorites table is `(user_id, entity_id)`, each returned row represents one
 * distinct user's favorite, so the row count per entity equals the total
 * favorite count for that entity.
 *
 * entityIds are deduplicated + sorted before the request so that navigating
 * back to a previously-seen list does not refetch.
 */
export function useBatchFavoriteCounts(
  type: EntityType,
  entityIds: string[],
): UseBatchFavoriteCountsResult {
  const uniqueIds = useMemo(
    () => [...new Set(entityIds)].sort(),
    [entityIds],
  );

  if (uniqueIds.length === 0) {
    return {
      counts: new Map<string, number>(),
      isLoading: false,
      isError: false,
      error: null,
    };
  }

  const key = batchFavoriteCountsKey(type, uniqueIds);

  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from(favoriteTableName(type) as any)
        .select(entityIdColumn(type) as any)
        .in(entityIdColumn(type), uniqueIds);

      if (error) throw error;

      const counts = new Map<string, number>();
      for (const row of (data ?? []) as unknown as Array<Record<string, unknown>>) {
        const id = row[entityIdColumn(type)] as string;
        counts.set(id, (counts.get(id) ?? 0) + 1);
      }
      return counts;
    },
    enabled: uniqueIds.length > 0,
  });

  return {
    counts: (query.data ?? new Map<string, number>()) as ReadonlyMap<
      string,
      number
    >,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}
// ── Convenience: derive per-entity props for a list of entities ─────────────

export interface EntityFavoriteProps {
  /** True when the current user has favorited this entity. */
  isFavorite: boolean;
  /** Total number of users who favorited this entity (0 when unknown). */
  favoriteCount: number;
}

/**
 * Given a list of entity IDs and the two batched query results, returns a
 * lookup Map `(id) => EntityFavoriteProps`.  Missing counts default to 0
 * and missing favorite state defaults to false so cards always have something
 * to render.
 */
export function deriveFavoriteProps(
  ids: readonly string[],
  favoriteIds: ReadonlySet<string>,
  counts: ReadonlyMap<string, number>,
): ReadonlyMap<string, EntityFavoriteProps> {
  const out = new Map<string, EntityFavoriteProps>();
  for (const id of ids) {
    out.set(
      id,
      {
        isFavorite: favoriteIds.has(id),
        favoriteCount: counts.get(id) ?? 0,
      },
    );
  }
  return out;
}