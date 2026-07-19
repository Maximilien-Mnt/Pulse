import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type { TagSuggestion } from "@/types";

/**
 * Fetches the top 30 distinct tags from posts with their counts.
 * Returns the first 10 that fuzzy-match the current input.
 */
async function fetchAllTags(): Promise<TagSuggestion[]> {
  // We fetch tags from posts and count them client-side
  const { data, error } = await supabase
    .from("posts")
    .select("tags")
    .not("tags", "is", null);

  if (error) throw error;

  const freq = new Map<string, number>();
  for (const row of data ?? []) {
    for (const tag of row.tags ?? []) {
      const t = tag.toLowerCase().trim();
      if (t) freq.set(t, (freq.get(t) ?? 0) + 1);
    }
  }

  return [...freq.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 30);
}

export function useTagSuggestions(input: string) {
  const { data: allTags = [] } = useQuery({
    queryKey: ["tag-suggestions"],
    queryFn: fetchAllTags,
    staleTime: 60_000, // 1 min cache
  });

  const filtered = useMemo(() => {
    if (!input.trim()) return [];
    const q = input.toLowerCase().trim();
    return allTags
      .filter((t) => t.tag.includes(q))
      .slice(0, 10);
  }, [allTags, input]);

  return filtered;
}