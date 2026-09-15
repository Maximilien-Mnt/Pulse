import { getIntlLocale } from "@/lib/locale";
import type { Language } from "@/stores/languageStore";

/**
 * Fusion simple de classes Tailwind/NativeWind.
 */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/**
 * Locale-aware quantity formatting (grouping, digits) for the active
 * language. Falls back to a plain string when Intl is unavailable.
 */
export function formatCount(value: number, language?: Language): string {
  const n = Number.isFinite(value) ? value : 0;
  try {
    return new Intl.NumberFormat(getIntlLocale(language)).format(n);
  } catch {
    return String(n);
  }
}

/**
 * Locale-aware price from a cents amount, in the user's language:
 * "18 €" (fr) / "€18" (en). Rendered without decimals.
 */
export function formatCurrencyFromCents(
  cents: number | null | undefined,
  options: { language?: Language; currency?: string } = {},
): string {
  const { language, currency = "EUR" } = options;
  const amount = (cents ?? 0) / 100;
  try {
    return new Intl.NumberFormat(getIntlLocale(language), {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount.toFixed(0)} €`;
  }
}

export function formatPriceFromCents(
  cents: number | null | undefined,
  isPaid: boolean,
  freeLabel = "Gratuit",
): string {
  if (!isPaid || cents === null || cents === undefined || cents === 0) return freeLabel;
  return formatCurrencyFromCents(cents);
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
