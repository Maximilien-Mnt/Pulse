// ---------------------------------------------------------------------------
// PULSE FEED - Shared search model + client-side filtering
//
// The old slide-down <SearchPanel> UI was removed: the feed search bar is now
// a plain field (like explore) and the filter/sort controls live in their own
// inline panels (FeedFilterPanel / FeedSortPanel). What remains here is the
// shared data model those panels and the feed screen depend on:
//   - SearchOptions / SearchScope / SearchSort types
//   - DEFAULT_SEARCH_OPTIONS
//   - activeFiltersSummary (label helper)
//   - applySearch (client-side filter + sort over loaded posts)
// ---------------------------------------------------------------------------

import type { FeedPost, PostFormat } from "@/types";
import { t } from "@/hooks/useTranslation";

export type SearchScope = "profiles" | "title" | "description" | "tag";
export type SearchSort = "relevance" | "date" | "likes" | "comments" | "shares";

export type SearchOptions = {
  scopes: SearchScope[];
  sort: SearchSort;
  formats: PostFormat[];
  tag: string;
};

export const DEFAULT_SEARCH_OPTIONS: SearchOptions = {
  scopes: ["title", "description"],
  sort: "relevance",
  formats: [],
  tag: "",
};

const SCOPE_LABELS: { key: SearchScope; label: string }[] = [
  { key: "profiles", label: "Profils" },
  { key: "title", label: "Titre" },
  { key: "description", label: "Description" },
  { key: "tag", label: "Tag" },
];

const SORT_LABELS: { key: SearchSort; label: string }[] = [
  { key: "relevance", label: "Pertinence" },
  { key: "date", label: "Date" },
  { key: "likes", label: "Likes" },
  { key: "comments", label: "Commentaires" },
  { key: "shares", label: "Partages" },
];

const FORMAT_LABELS: { key: PostFormat; label: string }[] = [
  { key: "text", label: "Texte" },
  { key: "image", label: "Image" },
  { key: "gallery", label: "Galerie" },
  { key: "video", label: t("media.video") },
];

export function activeFiltersSummary(options: SearchOptions): { key: string; label: string }[] {
  const active: { key: string; label: string }[] = [];

  const sortLabel = SORT_LABELS.find((s) => s.key === options.sort)?.label;
  if (sortLabel) active.push({ key: `sort-${options.sort}`, label: `Tri : ${sortLabel}` });

  for (const f of FORMAT_LABELS) {
    if (options.formats.includes(f.key)) {
      active.push({ key: `format-${f.key}`, label: f.label });
    }
  }

  if (options.tag.trim()) {
    active.push({ key: "tag", label: `#${options.tag.trim()}` });
  }

  const isDefaultScopes =
    options.scopes.length === 2 &&
    options.scopes.includes("title") &&
    options.scopes.includes("description");
  if (!isDefaultScopes) {
    const scopeLabels = options.scopes.map(
      (s) => SCOPE_LABELS.find((sl) => sl.key === s)?.label ?? s
    );
    active.push({ key: "scopes", label: `Dans : ${scopeLabels.join(", ")}` });
  }

  return active;
}

/**
 * Client-side application of the search options to loaded posts.
 */
export function applySearch(posts: FeedPost[], query: string, options: SearchOptions): FeedPost[] {
  const q = query.trim().toLowerCase();
  const tag = options.tag.trim().toLowerCase();

  let result = posts.filter((p) => {
    // Format filter.
    if (options.formats.length && !options.formats.includes(p.format)) return false;

    // Specific tag filter.
    if (tag && !(p.tags ?? []).some((x) => x.toLowerCase().includes(tag))) return false;

    // Text query across the selected scopes.
    if (!q) return true;
    const matches: boolean[] = [];
    if (options.scopes.includes("title")) matches.push(p.title.toLowerCase().includes(q));
    if (options.scopes.includes("description")) matches.push((p.body ?? "").toLowerCase().includes(q));
    if (options.scopes.includes("tag")) matches.push((p.tags ?? []).some((x) => x.toLowerCase().includes(q)));
    if (options.scopes.includes("profiles")) {
      matches.push(
        p.author.full_name.toLowerCase().includes(q) || p.author.username.toLowerCase().includes(q)
      );
    }
    return matches.some(Boolean);
  });

  const scoreRelevance = (p: FeedPost): number => {
    if (!q) return 0;
    let score = 0;
    if (p.title.toLowerCase().includes(q)) score += 3;
    if ((p.body ?? "").toLowerCase().includes(q)) score += 1;
    if ((p.tags ?? []).some((x) => x.toLowerCase() === q)) score += 2;
    return score;
  };

  result = [...result].sort((a, b) => {
    switch (options.sort) {
      case "date":
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case "likes":
        return b.likes_count - a.likes_count;
      case "comments":
        return b.comments_count - a.comments_count;
      case "shares":
        return b.shares_count - a.shares_count;
      case "relevance":
      default:
        return scoreRelevance(b) - scoreRelevance(a);
    }
  });

  return result;
}
