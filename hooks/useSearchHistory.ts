import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "pulse.search.history";
const MAX_ITEMS = 5;

/**
 * Persists the last 5 search queries in AsyncStorage.
 */
export function useSearchHistory() {
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setHistory(JSON.parse(raw));
      } catch {
        // ignore corrupt storage
      }
    })();
  }, []);

  const persist = useCallback(async (items: string[]) => {
    setHistory(items);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore write errors
    }
  }, []);

  const addSearch = useCallback(
    (query: string) => {
      const q = query.trim();
      if (!q) return;
      setHistory((prev) => {
        const next = [q, ...prev.filter((item) => item.toLowerCase() !== q.toLowerCase())].slice(0, MAX_ITEMS);
        void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        return next;
      });
    },
    []
  );

  const removeSearch = useCallback(
    (query: string) => {
      setHistory((prev) => {
        const next = prev.filter((item) => item !== query);
        void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        return next;
      });
    },
    []
  );

  const clearHistory = useCallback(() => {
    void persist([]);
  }, [persist]);

  return { history, addSearch, removeSearch, clearHistory };
}
