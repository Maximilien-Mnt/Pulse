import { useMemo } from 'react';
import { useSearchHistory } from './useSearchHistory';

const STOPWORDS = new Set([
  'le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'au', 'aux', 'et', 'ou', 'mais',
  'donc', 'or', 'ni', 'car', 'pour', 'par', 'sur', 'dans', 'avec', 'sans', 'sous',
  'entre', 'vers', 'chez', 'contre', 'devant', 'derrière', 'depuis', 'pendant',
  'avant', 'après', 'plus', 'moins', 'très', 'trop', 'assez', 'aussi', 'encore',
  'déjà', 'jamais', 'toujours', 'souvent', 'parfois', 'bien', 'mal', 'peu', 'autant',
  'comment', 'pourquoi', 'quand', 'où', 'qui', 'que', 'quoi', 'dont', 'où',
  'ce', 'cette', 'ces', 'mon', 'ma', 'mes', 'ton', 'ta', 'tes', 'son', 'sa', 'ses',
  'notre', 'nos', 'votre', 'vos', 'leur', 'leurs', 'je', 'tu', 'il', 'elle', 'nous',
  'vous', 'ils', 'elles', 'on', 'se', 'me', 'te', 'lui', 'y', 'en', 'pas', 'ne',
  'tout', 'tous', 'toute', 'toutes', 'autre', 'autres', 'même', 'chose', 'faire',
  'dire', 'voir', 'venir', 'aller', 'pouvoir', 'vouloir', 'devoir', 'savoir',
  'connaître', 'prendre', 'mettre', 'trouver', 'donner', 'parler', 'aimer',
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have',
  'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may',
  'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used', 'to',
  'of', 'in', 'on', 'at', 'by', 'from', 'as', 'into', 'through', 'during',
  'before', 'after', 'above', 'below', 'between', 'out', 'off', 'over', 'under',
  'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why',
  'how', 'all', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
  'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just',
  'because', 'but', 'and', 'or', 'if', 'while', 'with', 'without', 'about',
  'against', 'between', 'into', 'through', 'during', 'before', 'after', 'above',
  'below', 'to', 'from', 'up', 'down', 'in', 'out', 'on', 'off', 'over', 'under'
]);

export type FeedTagSuggestion = {
  tag: string;
  source: 'trending' | 'personalized' | 'default';
};

/**
 * Derives suggested tags for the feed from:
 * - Default static tags
 * - Trending tags extracted from recent posts' tags
 * - Personalized tags derived from the user's search history
 *
 * This hook is intentionally side-effect free so it can stay in the app bundle
 * without introducing new migrations, network calls, or analytics events.
 */
export function useFeedTagSuggestions(posts: { tags?: string[] | null }[] = [], _userId?: string) {
  const { history: searchHistory = [] } = useSearchHistory();

  const suggestions = useMemo(() => {
    const result: FeedTagSuggestion[] = [];

    // 1) Default tags – always shown first
    const defaults = ['pour-toi', 'abonnements'];
    for (const tag of defaults) {
      result.push({ tag, source: 'default' });
    }

    // 2) Trending tags from post tags
    const freq = new Map<string, number>();
    for (const post of posts) {
      for (const raw of post.tags ?? []) {
        const t = raw.toLowerCase().trim();
        if (!t) continue;
        freq.set(t, (freq.get(t) ?? 0) + 1);
      }
    }

    const trending = [...freq.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
      .map(({ tag }) => tag);

    for (const tag of trending) {
      if (!defaults.includes(tag)) {
        result.push({ tag, source: 'trending' });
      }
    }

    // 3) Personalized tags from search history
    const personalized = new Set<string>();
    for (const query of searchHistory) {
      const words = query
        .toLowerCase()
        .split(/[\s\-_+,.;:!?()\[\]{}"']+/)
        .filter((w) => w.length > 2 && !STOPWORDS.has(w));

      for (const word of words) {
        const t = word.trim();
        if (t && !personalized.has(t) && !defaults.includes(t) && !trending.includes(t)) {
          personalized.add(t);
        }
      }
    }

    const personalizedList = Array.from(personalized).slice(0, 6);
    for (const tag of personalizedList) {
      result.push({ tag, source: 'personalized' });
    }

    return result;
  }, [posts, searchHistory]);

  const trendingTags = useMemo(
    () => suggestions.filter((s) => s.source === 'trending').map((s) => s.tag),
    [suggestions]
  );

  const personalizedTags = useMemo(
    () => suggestions.filter((s) => s.source === 'personalized').map((s) => s.tag),
    [suggestions]
  );

  const defaultTags = useMemo(
    () => suggestions.filter((s) => s.source === 'default').map((s) => s.tag),
    [suggestions]
  );

  return {
    suggestions,
    trendingTags,
    personalizedTags,
    defaultTags,
  };
}
