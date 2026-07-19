import type { Ionicons } from "@expo/vector-icons";
import { COUNTRIES as FULL_COUNTRIES } from "@/utils/countries";

export { FULL_COUNTRIES as COUNTRIES };

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
  | "rugby";

export type SportDefinition = {
  id: SportId;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
};

export const SPORTS: SportDefinition[] = [
  { id: "football", label: "Football", icon: "football-outline", color: "#16A34A" },
  { id: "basketball", label: "Basketball", icon: "basketball-outline", color: "#EA580C" },
  { id: "tennis", label: "Tennis", icon: "tennisball-outline", color: "#EAB308" },
  { id: "running", label: "Course à pied", icon: "walk-outline", color: "#3B82F6" },
  { id: "cycling", label: "Cyclisme", icon: "bicycle-outline", color: "#6366F1" },
  { id: "swimming", label: "Natation", icon: "water-outline", color: "#06B6D4" },
  { id: "volleyball", label: "Volleyball", icon: "american-football-outline", color: "#F97316" },
  { id: "handball", label: "Handball", icon: "hand-left-outline", color: "#DC2626" },
  { id: "padel", label: "Padel", icon: "tennisball-outline", color: "#A855F7" },
  { id: "badminton", label: "Badminton", icon: "tennisball-outline", color: "#14B8A6" },
  { id: "fitness", label: "Fitness", icon: "barbell-outline", color: "#64748B" },
  { id: "rugby", label: "Rugby", icon: "american-football-outline", color: "#15803D" },
];

const defaultLevels = ["Débutant", "Intermédiaire", "Confirmé", "Compétition", "Élite"];
const defaultPractices = ["Loisir", "Compétition", "Mixte", "Entraînement structuré"];

export const SPORT_LEVELS: Record<SportId, string[]> = {
  football: ["Débutant", "Loisir", "Régional", "National", "Semi-pro", "Pro"],
  basketball: defaultLevels,
  tennis: ["25", "30/1", "30", "15", "5", "1", "NC"],
  running: ["Marche active", "5 km", "10 km", "Semi-marathon", "Marathon", "Ultra"],
  cycling: ["Découverte", "Loisir", "Club", "Gran fondo", "Compétition UCI amateur"],
  swimming: ["Apprentissage", "Loisir", "Maître", "Compétition régionale", "Compétition nationale"],
  volleyball: defaultLevels,
  handball: defaultLevels,
  padel: ["Débutant", "Intermédiaire", "4e série", "3e série", "2e série", "1re série"],
  badminton: ["Débutant", "P25", "P17", "P12", "P5", "Nationale"],
  fitness: ["Remise en forme", "Hypertrophie", "Force", "Cross-training", "Préparation athlétique"],
  rugby: ["École de rugby", "Loisir", "Fédérale 3", "Fédérale 2", "Fédérale 1", "Pro D2", "Top 14"],
};

export const SPORT_PRACTICES: Record<SportId, string[]> = {
  football: ["Loisir", "Foot à 5/7", "Club amateur", "Compétition", "Entraînement technique"],
  basketball: ["Street", "Club loisir", "Club compétition", "3x3", "Shooting / skills"],
  tennis: ["Loisir", "Tournois", "Cours collectifs", "Padel en complément", "Compétition ITF"],
  running: ["Tapis", "Route", "Trail", "Piste", "Fractionné"],
  cycling: ["Route", "Gravel", "VTT", "Home trainer", "Piste"],
  swimming: ["Bassin loisir", "Maîtres", "Eau libre", "Technique", "Prépa triathlon"],
  volleyball: ["Beach", "Salle loisir", "Salle compétition", "Mixte entreprise"],
  handball: ["Loisir", "Club amateur", "Compétition jeunes", "Compétition adultes"],
  padel: ["Loisir", "Tournois", "Ligue", "Coaching"],
  badminton: ["Loisir", "Double", "Simple", "Compétition"],
  fitness: ["Musculation", "Cardio", "HIIT", "Yoga/Pilates", "Coaching perso"],
  rugby: ["Touch", "Loisir", "XV", "VII", "Compétition"],
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
  { code: "de", label: "Deutsch" },
  { code: "pt", label: "Português" },
] as const;

export const COLORS = {
  primary: "#1E6BFF",
  primaryDark: "#1550CC",
  accent: "#FFD600",
  success: "#22C55E",
  error: "#EF4444",
  warning: "#F59E0B",
  lightBackground: "#F8FAFC",
  lightSurface: "#FFFFFF",
  lightText: "#0F172A",
  darkBackground: "#0A0F1E",
  darkSurface: "#131929",
  darkText: "#F8FAFC",
  darkBorder: "#1E293B",
  inactiveTab: "#94A3B8",
} as const;

export const CLUB_SORT_OPTIONS = [
  { value: "relevance", label: "Pertinence" },
  { value: "name_asc", label: "A → Z" },
  { value: "name_desc", label: "Z → A" },
  { value: "members_desc", label: "Plus de membres" },
  { value: "members_asc", label: "Moins de membres" },
  { value: "recent", label: "Récent" },
  { value: "oldest", label: "Ancien" },
  { value: "nearby", label: "Proche de moi" },
] as const;

export const EVENT_SORT_OPTIONS = [
  { value: "date_asc", label: "Date (prochain)" },
  { value: "relevance", label: "Pertinence" },
  { value: "name_asc", label: "A → Z" },
  { value: "price_asc", label: "Prix ↑" },
  { value: "price_desc", label: "Prix ↓" },
  { value: "difficulty_asc", label: "Difficulté ↑" },
  { value: "difficulty_desc", label: "Difficulté ↓" },
  { value: "nearby", label: "Proche de moi" },
] as const;

export const EVENT_CATEGORIES = ["Tournoi", "Stage", "Randonnée", "Séance ouverte", "Ligue", "Social"] as const;
