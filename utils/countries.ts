import { Platform } from "react-native";
import { COUNTRIES_EN } from "@/utils/countries.en";
import { useLanguageStore } from "@/stores/languageStore";

export { COUNTRIES_EN };

/**
 * Full ISO 3166-1 alpha-2 country list with French labels.
 * 196 entries.
 */
export const COUNTRIES: { code: string; label: string }[] = [
  { code: "AF", label: "Afghanistan" },
  { code: "AL", label: "Albanie" },
  { code: "DZ", label: "Algérie" },
  { code: "AD", label: "Andorre" },
  { code: "AO", label: "Angola" },
  { code: "AG", label: "Antigua-et-Barbuda" },
  { code: "AR", label: "Argentine" },
  { code: "AM", label: "Arménie" },
  { code: "AU", label: "Australie" },
  { code: "AT", label: "Autriche" },
  { code: "AZ", label: "Azerbaïdjan" },
  { code: "BS", label: "Bahamas" },
  { code: "BH", label: "Bahreïn" },
  { code: "BD", label: "Bangladesh" },
  { code: "BB", label: "Barbade" },
  { code: "BY", label: "Biélorussie" },
  { code: "BE", label: "Belgique" },
  { code: "BZ", label: "Belize" },
  { code: "BJ", label: "Bénin" },
  { code: "BT", label: "Bhoutan" },
  { code: "BO", label: "Bolivie" },
  { code: "BA", label: "Bosnie-Herzégovine" },
  { code: "BW", label: "Botswana" },
  { code: "BR", label: "Brésil" },
  { code: "BN", label: "Brunei" },
  { code: "BG", label: "Bulgarie" },
  { code: "BF", label: "Burkina Faso" },
  { code: "BI", label: "Burundi" },
  { code: "KH", label: "Cambodge" },
  { code: "CM", label: "Cameroun" },
  { code: "CA", label: "Canada" },
  { code: "CV", label: "Cap-Vert" },
  { code: "CF", label: "République centrafricaine" },
  { code: "TD", label: "Tchad" },
  { code: "CL", label: "Chili" },
  { code: "CN", label: "Chine" },
  { code: "CO", label: "Colombie" },
  { code: "KM", label: "Comores" },
  { code: "CG", label: "Congo" },
  { code: "CD", label: "République démocratique du Congo" },
  { code: "CR", label: "Costa Rica" },
  { code: "CI", label: "Côte d'Ivoire" },
  { code: "HR", label: "Croatie" },
  { code: "CU", label: "Cuba" },
  { code: "CY", label: "Chypre" },
  { code: "CZ", label: "Tchéquie" },
  { code: "DK", label: "Danemark" },
  { code: "DJ", label: "Djibouti" },
  { code: "DM", label: "Dominique" },
  { code: "DO", label: "République dominicaine" },
  { code: "EC", label: "Équateur" },
  { code: "EG", label: "Égypte" },
  { code: "SV", label: "Salvador" },
  { code: "GQ", label: "Guinée équatoriale" },
  { code: "ER", label: "Érythrée" },
  { code: "EE", label: "Estonie" },
  { code: "SZ", label: "Eswatini" },
  { code: "ET", label: "Éthiopie" },
  { code: "FJ", label: "Fidji" },
  { code: "FI", label: "Finlande" },
  { code: "FR", label: "France" },
  { code: "GA", label: "Gabon" },
  { code: "GM", label: "Gambie" },
  { code: "GE", label: "Géorgie" },
  { code: "DE", label: "Allemagne" },
  { code: "GH", label: "Ghana" },
  { code: "GR", label: "Grèce" },
  { code: "GD", label: "Grenade" },
  { code: "GT", label: "Guatemala" },
  { code: "GN", label: "Guinée" },
  { code: "GW", label: "Guinée-Bissau" },
  { code: "GY", label: "Guyana" },
  { code: "HT", label: "Haïti" },
  { code: "HN", label: "Honduras" },
  { code: "HU", label: "Hongrie" },
  { code: "IS", label: "Islande" },
  { code: "IN", label: "Inde" },
  { code: "ID", label: "Indonésie" },
  { code: "IR", label: "Iran" },
  { code: "IQ", label: "Irak" },
  { code: "IE", label: "Irlande" },
  { code: "IL", label: "Israël" },
  { code: "IT", label: "Italie" },
  { code: "JM", label: "Jamaïque" },
  { code: "JP", label: "Japon" },
  { code: "JO", label: "Jordanie" },
  { code: "KZ", label: "Kazakhstan" },
  { code: "KE", label: "Kenya" },
  { code: "KI", label: "Kiribati" },
  { code: "KP", label: "Corée du Nord" },
  { code: "KR", label: "Corée du Sud" },
  { code: "KW", label: "Koweït" },
  { code: "KG", label: "Kirghizistan" },
  { code: "LA", label: "Laos" },
  { code: "LV", label: "Lettonie" },
  { code: "LB", label: "Liban" },
  { code: "LS", label: "Lesotho" },
  { code: "LR", label: "Libéria" },
  { code: "LY", label: "Libye" },
  { code: "LI", label: "Liechtenstein" },
  { code: "LT", label: "Lituanie" },
  { code: "LU", label: "Luxembourg" },
  { code: "MG", label: "Madagascar" },
  { code: "MW", label: "Malawi" },
  { code: "MY", label: "Malaisie" },
  { code: "MV", label: "Maldives" },
  { code: "ML", label: "Mali" },
  { code: "MT", label: "Malte" },
  { code: "MH", label: "Îles Marshall" },
  { code: "MR", label: "Mauritanie" },
  { code: "MU", label: "Maurice" },
  { code: "MX", label: "Mexique" },
  { code: "FM", label: "Micronésie" },
  { code: "MD", label: "Moldavie" },
  { code: "MC", label: "Monaco" },
  { code: "MN", label: "Mongolie" },
  { code: "ME", label: "Monténégro" },
  { code: "MA", label: "Maroc" },
  { code: "MZ", label: "Mozambique" },
  { code: "MM", label: "Myanmar" },
  { code: "NA", label: "Namibie" },
  { code: "NR", label: "Nauru" },
  { code: "NP", label: "Népal" },
  { code: "NL", label: "Pays-Bas" },
  { code: "NZ", label: "Nouvelle-Zélande" },
  { code: "NI", label: "Nicaragua" },
  { code: "NE", label: "Niger" },
  { code: "NG", label: "Nigeria" },
  { code: "MK", label: "Macédoine du Nord" },
  { code: "NO", label: "Norvège" },
  { code: "OM", label: "Oman" },
  { code: "PK", label: "Pakistan" },
  { code: "PW", label: "Palaos" },
  { code: "PS", label: "Palestine" },
  { code: "PA", label: "Panama" },
  { code: "PG", label: "Papouasie-Nouvelle-Guinée" },
  { code: "PY", label: "Paraguay" },
  { code: "PE", label: "Pérou" },
  { code: "PH", label: "Philippines" },
  { code: "PL", label: "Pologne" },
  { code: "PT", label: "Portugal" },
  { code: "QA", label: "Qatar" },
  { code: "RO", label: "Roumanie" },
  { code: "RU", label: "Russie" },
  { code: "RW", label: "Rwanda" },
  { code: "KN", label: "Saint-Christophe-et-Niévès" },
  { code: "LC", label: "Sainte-Lucie" },
  { code: "VC", label: "Saint-Vincent-et-les-Grenadines" },
  { code: "WS", label: "Samoa" },
  { code: "SM", label: "Saint-Marin" },
  { code: "ST", label: "Sao Tomé-et-Principe" },
  { code: "SA", label: "Arabie saoudite" },
  { code: "SN", label: "Sénégal" },
  { code: "RS", label: "Serbie" },
  { code: "SC", label: "Seychelles" },
  { code: "SL", label: "Sierra Leone" },
  { code: "SG", label: "Singapour" },
  { code: "SK", label: "Slovaquie" },
  { code: "SI", label: "Slovénie" },
  { code: "SB", label: "Îles Salomon" },
  { code: "SO", label: "Somalie" },
  { code: "ZA", label: "Afrique du Sud" },
  { code: "SS", label: "Soudan du Sud" },
  { code: "ES", label: "Espagne" },
  { code: "LK", label: "Sri Lanka" },
  { code: "SD", label: "Soudan" },
  { code: "SR", label: "Suriname" },
  { code: "SE", label: "Suède" },
  { code: "CH", label: "Suisse" },
  { code: "SY", label: "Syrie" },
  { code: "TW", label: "Taïwan" },
  { code: "TJ", label: "Tadjikistan" },
  { code: "TZ", label: "Tanzanie" },
  { code: "TH", label: "Thaïlande" },
  { code: "TL", label: "Timor oriental" },
  { code: "TG", label: "Togo" },
  { code: "TO", label: "Tonga" },
  { code: "TT", label: "Trinité-et-Tobago" },
  { code: "TN", label: "Tunisie" },
  { code: "TR", label: "Turquie" },
  { code: "TM", label: "Turkménistan" },
  { code: "TV", label: "Tuvalu" },
  { code: "UG", label: "Ouganda" },
  { code: "UA", label: "Ukraine" },
  { code: "AE", label: "Émirats arabes unis" },
  { code: "GB", label: "Royaume-Uni" },
  { code: "US", label: "États-Unis" },
  { code: "UY", label: "Uruguay" },
  { code: "UZ", label: "Ouzbékistan" },
  { code: "VU", label: "Vanuatu" },
  { code: "VA", label: "Vatican" },
  { code: "VE", label: "Venezuela" },
  { code: "VN", label: "Viêt Nam" },
  { code: "YE", label: "Yémen" },
  { code: "ZM", label: "Zambie" },
  { code: "ZW", label: "Zimbabwe" },
];

export type Country = { code: string; label: string };

/**
 * Curated shortlist of common countries (French labels), ordered with
 * France first. Used for the horizontal quick-country chips on the event
 * and club creation screens. Signup uses the full COUNTRIES list instead.
 */
export const COMMON_COUNTRIES: Country[] = [
  { code: "FR", label: "France" },
  { code: "BE", label: "Belgique" },
  { code: "LU", label: "Luxembourg" },
  { code: "IT", label: "Italie" },
  { code: "DE", label: "Allemagne" },
  { code: "ES", label: "Espagne" },
  { code: "CH", label: "Suisse" },
  { code: "NL", label: "Pays-Bas" },
  { code: "PT", label: "Portugal" },
  { code: "GB", label: "Royaume-Uni" },
  { code: "IE", label: "Irlande" },
  { code: "US", label: "États-Unis" },
  { code: "CA", label: "Canada" },
  { code: "MA", label: "Maroc" },
  { code: "TN", label: "Tunisie" },
  { code: "DZ", label: "Algérie" },
];

/**
 * Returns the native OS flag emoji for an ISO 3166-1 alpha-2 code
 * (e.g. "FR" -> "🇫🇷"). Falls back to an empty string for invalid codes.
 */
export function flagEmoji(code: string): string {
  const upper = code.toUpperCase();
  if (!/^[A-Z]{2}$/.test(upper)) return "";
  // Regional indicator symbols: each letter A-Z maps to U+1F1E6..U+1F1FF
  return String.fromCodePoint(
    ...Array.from(upper, (c) => 0x1f1e6 + c.charCodeAt(0) - 65)
  );
}

let cachedFlagEmojiSupport: boolean | null = null;

/**
 * True when the current environment provides a real 2D canvas that can measure
 * text. jsdom (test env) ships a canvas whose `getContext("2d")` is not
 * implemented, so we skip detection there — the conservative `true` (emoji)
 * default applies, which is exactly what the tests render.
 */
function canMeasureCanvasText(): boolean {
  if (typeof document === "undefined") return false;
  try {
    // jsdom's canvas is a stub; don't attempt measurement there.
    if (
      typeof navigator !== "undefined" &&
      typeof navigator.userAgent === "string" &&
      /jsdom/i.test(navigator.userAgent)
    ) {
      return false;
    }
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext && canvas.getContext("2d");
    return !!ctx && typeof ctx.measureText === "function";
  } catch {
    return false;
  }
}

/**
 * Detects whether the current platform renders emoji flags as a single glyph
 * instead of two separate letter characters.
 *
 * - Native (iOS / Android): flag emojis are always rendered → `true`.
 * - Web: uses a canvas measurement heuristic. Platforms without a flag font
 *   (most notably Windows browsers) fall back to drawing the two regional
 *   indicator letters, which measure roughly 2× a single letter, so flags are
 *   detected as unsupported and the abbreviation fallback kicks in.
 *
 * The result is cached for the lifetime of the app. Detection is conservative:
 * any failure to measure defaults to `true` (emoji-first, per product spec).
 */
export function flagEmojiSupported(): boolean {
  if (cachedFlagEmojiSupport !== null) return cachedFlagEmojiSupport;
  let supported = true;
  if (Platform.OS === "web" && canMeasureCanvasText()) {
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.font = "48px sans-serif";
        // "FR" as regional indicator symbols (U+1F1EB U+1F1F7)
        const flagWidth = ctx.measureText("\u{1F1EB}\u{1F1F7}").width;
        const letterWidth = ctx.measureText("F").width;
        // Real flag glyph ≈ 1 letter width; two fallback letters ≈ 2×.
        if (flagWidth > 0 && letterWidth > 0) {
          supported = flagWidth / letterWidth < 1.5;
        }
      }
    } catch {
      supported = true;
    }
  }
  cachedFlagEmojiSupport = supported;
  return supported;
}

/**
 * Test-only override for the cached flag-emoji support result.
 * Pass a boolean to force the support state, or `null` to reset it back to
 * runtime detection.
 */
export function __setFlagEmojiSupported(supported: boolean | null): void {
  cachedFlagEmojiSupport = supported;
}

/**
 * Returns the flag shown for an ISO 3166-1 alpha-2 country code.
 *
 * By default this is the native OS flag emoji (e.g. "FR" -> "🇫🇷"). If the
 * platform cannot render emoji flags (e.g. most Windows web browsers, which
 * would otherwise show two letter glyphs instead of a flag), it gracefully
 * falls back to the plain ISO abbreviation ("FR") so the UI never shows a
 * broken or corrupt glyph.
 *
 * Returns "" for empty or non-ISO codes.
 */
export function countryFlag(code: string | null | undefined): string {
  if (!code) return "";
  const upper = code.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(upper)) return "";
  return flagEmojiSupported() ? flagEmoji(upper) : upper;
}

/**
 * Returns the localized label for an ISO country code, falling back to the
 * raw code itself when the code is unknown (e.g. externally-synced rows).
 * French is the canonical source; English is served from COUNTRIES_EN when
 * the interface language is English.
 */
export function getCountryLabel(code: string | null | undefined): string {
  if (!code) return "";
  const lang = useLanguageStore.getState().language;
  if (lang === "en") return COUNTRIES_EN[code] ?? code;
  return COUNTRIES.find((c) => c.code === code)?.label ?? code;
}

/**
 * Returns a display string with the country flag + localized label:
 * "FR" -> "🇫🇷 France". When flag emojis cannot be rendered, the ISO
 * abbreviation replaces the flag ("FR France"). Falls back to the raw
 * code if unknown.
 */
export function getCountryDisplay(code: string | null | undefined): string {
  if (!code) return "";
  const flag = countryFlag(code);
  if (!flag) return getCountryLabel(code);
  return `${flag} ${getCountryLabel(code)}`.trim();
}
