import { COUNTRIES as FULL_COUNTRIES } from "@/utils/countries";
import { Platform } from "react-native";

export { FULL_COUNTRIES as COUNTRIES };

/**
 * Builds the redirect URL used by Supabase Auth for password recovery.
 *
 * - On web: uses the current origin so it works in dev (localhost) and prod.
 * - On native (Expo Go / standalone): uses the app scheme so the link opens
 *   the app via deep linking (e.g. `pulse://auth/reset-password`).
 *
 * The path `/auth/reset-password` maps to `app/auth/reset-password.tsx` in Expo Router.
 */
export function getRedirectUrl(): string {
  const path = "/auth/reset-password";
  if (Platform.OS === "web") {
    // Use the current origin on web (works for localhost dev and production)
    if (typeof window !== "undefined" && window.location.origin) {
      return `${window.location.origin}${path}`;
    }
    return `http://localhost:8081${path}`;
  }
  // Native: use the app scheme (e.g. pulse://auth/reset-password)
  const scheme = process.env.EXPO_PUBLIC_APP_SCHEME || "pulse";
  return `${scheme}://${path.replace(/^\//, "")}`;
}

export type SportId =
  | "football"
  | "basketball"
  | "tennis"
  | "running"
  | "cycling"
  | "swimming"
  | "volleyball"
  | "handball"
  | "padel"
  | "badminton"
  | "fitness"
  | "rugby"
  | "squash"
  | "table_tennis"
  | "martial_arts"
  | "yoga"
  | "pilates"
  | "boxing"
  | "climbing"
  | "golf"
  | "dance"
  | "surfing";

export type SportDefinition = {
  id: SportId;
  label: string;
  icon: string;
  color: string;
};

export const SPORTS: SportDefinition[] = [
  { id: "football", label: "Football", icon: "football-outline", color: "#16A34A" },
  { id: "basketball", label: "Basketball", icon: "basketball-outline", color: "#EA580C" },
  { id: "tennis", label: "Tennis", icon: "tennisball-outline", color: "#EAB308" },
  { id: "running", label: "Course à pied", icon: "walk-outline", color: "#3B82F6" },
  { id: "cycling", label: "Cyclisme", icon: "bicycle-outline", color: "#6366F1" },
  { id: "swimming", label: "Natation", icon: "swim-outline", color: "#06B6D4" },
  { id: "volleyball", label: "Volleyball", icon: "american-football-outline", color: "#F97316" },
  { id: "handball", label: "Handball", icon: "hand-right-outline", color: "#DC2626" },
  { id: "padel", label: "Padel", icon: "tennisball-outline", color: "#A855F7" },
  { id: "badminton", label: "Badminton", icon: "tennisball-outline", color: "#14B8A6" },
  { id: "fitness", label: "Fitness", icon: "barbell-outline", color: "#64748B" },
  { id: "rugby", label: "Rugby", icon: "american-football-outline", color: "#15803D" },
  { id: "squash", label: "Squash", icon: "circle-outline", color: "#0891B2" },
  { id: "table_tennis", label: "Tennis de table", icon: "disc-outline", color: "#BE185D" },
  { id: "martial_arts", label: "Arts martiaux", icon: "shield-outline", color: "#B45309" },
  { id: "yoga", label: "Yoga", icon: "body-outline", color: "#7C3AED" },
  { id: "pilates", label: "Pilates", icon: "accessibility-outline", color: "#DB2777" },
  { id: "boxing", label: "Boxe", icon: "flash-outline", color: "#991B1B" },
  { id: "climbing", label: "Escalade", icon: "trending-up-outline", color: "#4F46E5" },
  { id: "golf", label: "Golf", icon: "locate-outline", color: "#15803D" },
  { id: "dance", label: "Danse", icon: "musical-notes-outline", color: "#C026D3" },
  { id: "surfing", label: "Surf", icon: "water-outline", color: "#0EA5E9" },
];

const defaultLevels = ["Débutant", "Intermédiaire", "Confirmé", "Compétition", "Élite"];
const defaultPractices = ["Loisir", "Compétition", "Mixte", "Entraînement structuré"];

function withOther<T>(arr: readonly T[]): T[] {
  return [...arr, "Autre" as T];
}

export const SPORT_LEVELS: Record<SportId, string[]> = {
  football: withOther(["Débutant", "Loisir", "Régional", "National", "Semi-pro", "Pro"]),
  basketball: withOther(defaultLevels),
  tennis: withOther(["25", "30/1", "30", "15", "5", "1", "NC"]),
  running: withOther(["Marche active", "5 km", "10 km", "Semi-marathon", "Marathon", "Ultra"]),
  cycling: withOther(["Découverte", "Loisir", "Club", "Gran fondo", "Compétition UCI amateur"]),
  swimming: withOther(["Apprentissage", "Loisir", "Maître", "Compétition régionale", "Compétition nationale"]),
  volleyball: withOther(defaultLevels),
  handball: withOther(defaultLevels),
  padel: withOther(["Débutant", "Intermédiaire", "4e série", "3e série", "2e série", "1re série"]),
  badminton: withOther(["Débutant", "P25", "P17", "P12", "P5", "Nationale"]),
  fitness: withOther(["Remise en forme", "Hypertrophie", "Force", "Cross-training", "Préparation athlétique"]),
  rugby: withOther(["École de rugby", "Loisir", "Fédérale 3", "Fédérale 2", "Fédérale 1", "Pro D2", "Top 14"]),
  squash: withOther(["Débutant", "Intermédiaire", "Confirmé", "Compétition"]),
  table_tennis: withOther(["Débutant", "Loisir", "Régional", "National"]),
  martial_arts: withOther(["Débutant", "Intermédiaire", "Avancé", "Combat"]),
  yoga: withOther(["Débutant", "Intermédiaire", "Avancé", "Vinyasa", "Yin"]),
  pilates: withOther(["Débutant", "Intermédiaire", "Avancé", "Rééducation"]),
  boxing: withOther(["Débutant", "Loisir", "Amateur", "Préparation"]),
  climbing: withOther(["Débutant", "Intermédiaire", "Confirmé", "Compétition"]),
  golf: withOther(["Débutant", "Intermédiaire", "Confirmé", "Compétition"]),
  dance: withOther(["Débutant", "Intermédiaire", "Confirmé", "Compétition"]),
  surfing: withOther(["Débutant", "Intermédiaire", "Confirmé", "Compétition"]),
};

export const SPORT_PRACTICES: Record<SportId, string[]> = {
  football: withOther(["Loisir", "Foot à 5/7", "Club amateur", "Compétition", "Entraînement technique"]),
  basketball: withOther(["Street", "Club loisir", "Club compétition", "3x3", "Shooting / skills"]),
  tennis: withOther(["Loisir", "Tournois", "Cours collectifs", "Padel en complément", "Compétition ITF"]),
  running: withOther(["Tapis", "Route", "Trail", "Piste", "Fractionné"]),
  cycling: withOther(["Route", "Gravel", "VTT", "Home trainer", "Piste"]),
  swimming: withOther(["Bassin loisir", "Maîtres", "Eau libre", "Technique", "Prépa triathlon"]),
  volleyball: withOther(["Beach", "Salle loisir", "Salle compétition", "Mixte entreprise"]),
  handball: withOther(["Loisir", "Club amateur", "Compétition jeunes", "Compétition adultes"]),
  padel: withOther(["Loisir", "Tournois", "Ligue", "Coaching"]),
  badminton: withOther(["Loisir", "Double", "Simple", "Compétition"]),
  fitness: withOther(["Musculation", "Cardio", "HIIT", "Yoga/Pilates", "Coaching perso"]),
  rugby: withOther(["Touch", "Loisir", "XV", "VII", "Compétition"]),
  squash: withOther(["Loisir", "Club", "Compétition"]),
  table_tennis: withOther(["Loisir", "Club", "Compétition"]),
  martial_arts: withOther(["Loisir", "Club", "Compétition", "Self-défense"]),
  yoga: withOther(["Studio", "Maison", "Vinyasa", "Yin"]),
  pilates: withOther(["Studio", "Maison", "Rééducation"]),
  boxing: withOther(["Loisir", "Club", "Compétition", "Fitness"]),
  climbing: withOther(["Salle", "Bloc", "Falaise", "Compétition"]),
  golf: withOther(["Loisir", "Club", "Compétition", "Practice"]),
  dance: withOther(["Loisir", "Club", "Compétition", "Spectacle"]),
  surfing: withOther(["Loisir", "Club", "Compétition", "Bodyboard"]),
};


export const WEEKDAYS = [
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
  "Dimanche",
] as const;

export const OBJECTIVES = [
  "Perdre du poids",
  "Prendre du muscle",
  "Améliorer mon endurance",
  "Reprendre le sport",
  "Rencontrer des partenaires",
  "Participer à des compétitions",
  "Réduire le stress",
  "Améliorer ma souplesse",
  "Préparer un objectif (course, triathlon…)",
  "Découvrir un nouveau sport",
  "Autre",
] as const;

/**
 * Discovery sources shown on signup step 5 to answer
 * "Comment avez-vous découvert Pulse ?"
 *
 * `key` is a stable, language-independent identifier persisted as
 * `discovery_source`. `labelKey` maps to a translation key holding the
 * localized, human-readable label shown to the user.
 *
 * The special "other" entry reveals a free-text input for extra details.
 */
export const DISCOVERY_SOURCES: {
  key: string;
  labelKey: string;
}[] = [
  { key: "ai", labelKey: "signup.discovery.ai" },
  { key: "ads", labelKey: "signup.discovery.ads" },
  { key: "search", labelKey: "signup.discovery.search" },
  { key: "social", labelKey: "signup.discovery.social" },
  { key: "friend", labelKey: "signup.discovery.friend" },
  { key: "similar", labelKey: "signup.discovery.similar" },
  { key: "other", labelKey: "signup.discovery.other" },
] as const;

export const PUBLIC_SPORT_STATUSES = [
  "Coach",
  "Amateur",
  "Récréatif",
  "Semi-Professionnel",
  "Professionnel",
] as const;

export type CountryCode = string;

export const LANGUAGES = [
  { code: "fr", label: "Français" },
  { code: "en", label: "English" },
] as const;

/**
 * @deprecated Use `src/design-tokens/` instead.
 * Import { semanticColors } from "@/design-tokens" and use
 * semanticColors.light / semanticColors.dark.
 *
 * Kept for backward compatibility with existing callers
 * (e.g. constants.ts COLORS is still imported by some components).
 */
export { semanticColors } from "@/src/design-tokens";

// Re-export the light mode tokens under the old COLORS name
// for existing code that imports { COLORS } from "@/lib/constants".
export const COLORS = {
  primary: "#3358FF",           // blue-500
  primaryDark: "#2542DB",       // blue-600
  accent: "#FF5A36",            // coral-500
  success: "#17C982",           // green-500
  error: "#E5484D",             // error-500
  warning: "#F5A524",           // warning-500
  lightBackground: "#FAFAFB",   // neutral-25
  lightSurface: "#FFFFFF",      // neutral-0
  lightText: "#14161A",         // neutral-900
  darkBackground: "#0E1015",
  darkSurface: "#171A20",
  darkText: "#F5F6F8",
  darkBorder: "#262A32",
  inactiveTab: "#888D97",       // neutral-400
} as const;

export const CLUB_SORT_OPTIONS = [
  { value: "relevance", label: "Pertinence" },
  { value: "name_asc", label: "A → Z" },
  { value: "name_desc", label: "Z → A" },
  { value: "members_desc", label: "Plus de membres" },
  { value: "members_asc", label: "Moins de membres" },
  { value: "recent", label: "Récent" },
  { value: "oldest", label: "Ancien" },
  { value: "founded_desc", label: "Fondés récemment" },
  { value: "founded_asc", label: "Fondés plus anciens" },
  { value: "sport_asc", label: "Sport (A → Z)" },
  { value: "nearby", label: "Proche de moi" },
] as const;

export const EVENT_SORT_OPTIONS = [
  { value: "date_asc", label: "Date (prochain)" },
  { value: "date_desc", label: "Date (récent)" },
  { value: "relevance", label: "Pertinence" },
  { value: "name_asc", label: "A → Z" },
  { value: "name_desc", label: "Z → A" },
  { value: "price_asc", label: "Prix ↑" },
  { value: "price_desc", label: "Prix ↓" },
  { value: "difficulty_asc", label: "Difficulté ↑" },
  { value: "difficulty_desc", label: "Difficulté ↓" },
  { value: "newest", label: "Nouveaux" },
  { value: "nearby", label: "Proche de moi" },
] as const;

export const EVENT_CATEGORIES = ["Compétition", "Entraînement", "Sortie", "Ligue", "Social"] as const;
