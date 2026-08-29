import { useCallback, useMemo } from "react";
import type { FeedPost, PostFormat } from "@/types";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SlideDownOverlay } from "@/components/ui/SlideDownOverlay";
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

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`px-4 py-2.5 rounded-full border active:opacity-80 ${
        active
          ? "bg-primary border-primary"
          : "bg-transparent border-neutral-300 dark:border-neutral-700"
      }`}
    >
      <Text className={active ? "text-white text-sm" : "text-neutral-700 dark:text-neutral-200 text-sm"}>
        {label}
      </Text>
    </Pressable>
  );
}

type Props = {
  options: SearchOptions;
  onChange: (opts: SearchOptions) => void;
  history: string[];
  onSelectHistory: (q: string) => void;
  onRemoveHistory: (q: string) => void;
  onClearHistory: () => void;
  /** Whether the full panel is collapsed to the slim summary bar. */
  minimized: boolean;
  /** Called to expand/minimize the panel. */
  onToggleMinimize: () => void;
};

/**
 * Returns a human-readable summary of the currently active filter options,
 * used by the minimized filter bar.
 */
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

  // Only show scopes when they differ from the default selection.
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

export function SearchPanel({
  options,
  onChange,
  history,
  onSelectHistory,
  onRemoveHistory,
  onClearHistory,
  minimized,
  onToggleMinimize,
}: Props) {
  const toggleScope = (scope: SearchScope) => {
    const has = options.scopes.includes(scope);
    const scopes = has
      ? options.scopes.filter((s) => s !== scope)
      : [...options.scopes, scope];
    onChange({ ...options, scopes: scopes.length ? scopes : [scope] });
  };

  const toggleFormat = (format: PostFormat) => {
    const has = options.formats.includes(format);
    const formats = has
      ? options.formats.filter((f) => f !== format)
      : [...options.formats, format];
    onChange({ ...options, formats });
  };

  const handleMinimize = useCallback(() => {
    onToggleMinimize();
  }, [onToggleMinimize]);

  const summary = useMemo(() => activeFiltersSummary(options), [options]);

  // ── Minimized state: slim bar with active filter chips ─────────────
  if (minimized) {
    return (
      <View className="px-4 py-2 border-b border-neutral-200 dark:border-neutral-800 flex-row items-center gap-2">
        <Pressable
          onPress={handleMinimize}
          className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800"
          hitSlop={8}
        >
          <Ionicons name="options-outline" size={16} color="#94A3B8" />
          <Text className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
            Filtres
          </Text>
          <Ionicons name="chevron-down" size={16} color="#94A3B8" />
        </Pressable>

        {summary.length === 0 ? (
          <Text className="text-xs text-neutral-400">Aucun filtre actif</Text>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 6, alignItems: "center" }}
          >
            {summary.map((s) => (
              <View
                key={s.key}
                className="flex-row items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20"
              >
                <Text className="text-xs text-primary" numberOfLines={1}>
                  {s.label}
                </Text>
              </View>
            ))}
          </ScrollView>
        )}

        <Pressable onPress={handleMinimize} hitSlop={8} className="ml-auto">
          <Ionicons name="expand-outline" size={18} color="#94A3B8" />
        </Pressable>
      </View>
    );
  }

  // ── Expanded state: full panel inside the slide-down overlay ────────
  return (
    <SlideDownOverlay
      visible
      onClose={() => handleMinimize()}
      onDismiss={() => handleMinimize()}
      maxHeight={0.6}
    >
      {/* Header row with grab handle + minimize button */}
      <View className="flex-row items-center justify-between px-4 pt-1.5">
        <Pressable onPress={handleMinimize} hitSlop={8} className="p-1">
          <Ionicons name="chevron-up" size={22} color="#94A3B8" />
        </Pressable>
        <Text className="text-sm font-semibold text-neutral-500">Filtres et tri</Text>
        <Pressable onPress={handleMinimize} hitSlop={8} className="p-1">
          <Ionicons name="chevron-up" size={22} color="#94A3B8" />
        </Pressable>
      </View>

      <ScrollView
        className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 gap-3"
        keyboardShouldPersistTaps="handled"
      >
        <View>
          <Text className="text-xs font-semibold text-neutral-500 mb-2">Rechercher dans</Text>
          <View className="flex-row flex-wrap gap-2">
            {SCOPE_LABELS.map((s) => (
              <Chip
                key={s.key}
                label={s.label}
                active={options.scopes.includes(s.key)}
                onPress={() => toggleScope(s.key)}
              />
            ))}
          </View>
        </View>

        <View>
          <Text className="text-xs font-semibold text-neutral-500 mb-2">Trier par</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {SORT_LABELS.map((s) => (
              <Chip
                key={s.key}
                label={s.label}
                active={options.sort === s.key}
                onPress={() => onChange({ ...options, sort: s.key })}
              />
            ))}
          </ScrollView>
        </View>

        <View>
          <Text className="text-xs font-semibold text-neutral-500 mb-2">Format</Text>
          <View className="flex-row flex-wrap gap-2">
            {FORMAT_LABELS.map((f) => (
              <Chip
                key={f.key}
                label={f.label}
                active={options.formats.includes(f.key)}
                onPress={() => toggleFormat(f.key)}
              />
            ))}
          </View>
        </View>

        <View>
          <Text className="text-xs font-semibold text-neutral-500 mb-2">Tag spécifique</Text>
          <TextInput
            value={options.tag}
            onChangeText={(tag) => onChange({ ...options, tag })}
            placeholder="ex: running"
            placeholderTextColor="#94A3B8"
            autoCapitalize="none"
            className="px-3 py-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-50"
          />
        </View>

        {history.length > 0 ? (
          <View>
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-xs font-semibold text-neutral-500">Recherches récentes</Text>
              <Pressable onPress={onClearHistory} hitSlop={8}>
                <Text className="text-xs text-primary">Effacer</Text>
              </Pressable>
            </View>
            <View className="gap-1">
              {history.map((h) => (
                <View key={h} className="flex-row items-center justify-between">
                  <Pressable className="flex-1 flex-row items-center gap-2 py-1" onPress={() => onSelectHistory(h)}>
                    <Ionicons name="time-outline" size={16} color="#94A3B8" />
                    <Text className="text-neutral-700 dark:text-neutral-200">{h}</Text>
                  </Pressable>
                  <Pressable onPress={() => onRemoveHistory(h)} hitSlop={8}>
                    <Ionicons name="close" size={16} color="#94A3B8" />
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SlideDownOverlay>
  );
}

/**
 * Client-side application of the advanced search options to loaded posts.
 */
export function applySearch(posts: FeedPost[], query: string, options: SearchOptions): FeedPost[] {
  const q = query.trim().toLowerCase();
  const tag = options.tag.trim().toLowerCase();

  let result = posts.filter((p) => {
    // Format filter.
    if (options.formats.length && !options.formats.includes(p.format)) return false;

    // Specific tag filter.
    if (tag && !(p.tags ?? []).some((t) => t.toLowerCase().includes(tag))) return false;

    // Text query across the selected scopes.
    if (!q) return true;
    const matches: boolean[] = [];
    if (options.scopes.includes("title")) matches.push(p.title.toLowerCase().includes(q));
    if (options.scopes.includes("description")) matches.push((p.body ?? "").toLowerCase().includes(q));
    if (options.scopes.includes("tag")) matches.push((p.tags ?? []).some((t) => t.toLowerCase().includes(q)));
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
    if ((p.tags ?? []).some((t) => t.toLowerCase() === q)) score += 2;
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