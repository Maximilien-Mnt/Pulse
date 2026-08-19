import { QueryClient, dehydrate, hydrate } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuthStore } from "@/stores/authStore";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30_000,
      // Keep cached data around for 24h so it can be restored offline.
      gcTime: 1000 * 60 * 60 * 24,
    },
  },
});

const CACHE_KEY = "pulse:rq-cache";
const CACHE_VERSION = "v1";
// Max age of a persisted cache before we discard it (24h).
const MAX_AGE = 1000 * 60 * 60 * 24;

type PersistedCache = {
  version: string;
  timestamp: number;
  /** The authenticated user who owned the cached queries (null = signed out). */
  userId: string | null;
  clientState: ReturnType<typeof dehydrate>;
};

/**
 * Remove the persisted query cache from AsyncStorage.
 * Call on sign-out so the next app start doesn't rehydrate stale data.
 */
export async function removePersistedQueryCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CACHE_KEY);
  } catch {
    // Ignore.
  }
}

/**
 * Restore the query cache from AsyncStorage (cold start).
 *
 * On cold start the persisted cache is only valid if it was written by the
 * same user who is currently authenticated. If the persisted cache belongs
 * to a different account (e.g. the previous session) it is discarded so
 * stale data never leaks across accounts.
 *
 * Call once on app start (before rendering the tree that reads the cache).
 */
export async function restoreQueryCache(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as PersistedCache;
    if (parsed.version !== CACHE_VERSION) return;
    if (Date.now() - parsed.timestamp > MAX_AGE) {
      await AsyncStorage.removeItem(CACHE_KEY);
      return;
    }

    // Only hydrate if the cache belongs to the same user (or no user).
    // If the session changed between app launches, the cached data is stale.
    const currentUserId = useAuthStore.getState().userId;
    if (parsed.userId !== currentUserId) {
      await AsyncStorage.removeItem(CACHE_KEY);
      return;
    }

    hydrate(queryClient, parsed.clientState);
  } catch {
    // Ignore corrupt cache — start fresh.
  }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Subscribe to cache changes and persist them to AsyncStorage (debounced).
 * Returns an unsubscribe function.
 */
export function persistQueryCache(): () => void {
  const save = () => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        const clientState = dehydrate(queryClient, {
          // Only persist successful queries.
          shouldDehydrateQuery: (query) => query.state.status === "success",
        });
        const payload: PersistedCache = {
          version: CACHE_VERSION,
          timestamp: Date.now(),
          // Record which user owns these queries so we can discard the
          // cache at startup if it belongs to a different account.
          userId: useAuthStore.getState().userId,
          clientState,
        };
        void AsyncStorage.setItem(CACHE_KEY, JSON.stringify(payload));
      } catch {
        // Ignore serialization errors.
      }
    }, 1000);
  };

  const unsubscribe = queryClient.getQueryCache().subscribe(save);
  return () => {
    if (saveTimer) clearTimeout(saveTimer);
    unsubscribe();
  };
}