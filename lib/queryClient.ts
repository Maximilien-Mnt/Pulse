import { QueryClient, dehydrate, hydrate } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
  clientState: ReturnType<typeof dehydrate>;
};

/**
 * Restore the query cache from AsyncStorage.
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
