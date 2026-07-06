/**
 * Fusion simple de classes Tailwind/NativeWind.
 */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function formatPriceFromCents(cents: number | null | undefined, isPaid: boolean): string {
  if (!isPaid || cents === null || cents === undefined || cents === 0) return "Gratuit";
  return `${(cents / 100).toFixed(0)} €`;
}

/**
 * Normalise un tag avec préfixe #.
 */
export function normalizeTag(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  return t.startsWith("#") ? t : `#${t}`;
}

/**
 * Parse une chaîne de tags (espaces ou virgules).
 */
export function parseTagsInput(input: string, max = 10): string[] {
  const parts = input
    .split(/[\s,]+/)
    .map((p) => normalizeTag(p))
    .filter(Boolean);
  return Array.from(new Set(parts)).slice(0, max);
}
