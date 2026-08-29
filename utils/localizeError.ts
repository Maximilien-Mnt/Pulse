import type { Language } from "@/stores/languageStore";

/**
 * Maps the French validation messages emitted by the Zod schemas in
 * `utils/validation.ts` to their English equivalents.
 *
 * The signup/auth Zod schemas are authored in French. This helper lets the UI
 * render those messages in the currently-active interface language without
 * rewriting the schemas (which are shared with server-side logic and tests).
 */
const ERROR_MAP: Record<string, string> = {
  "Nom complet requis": "Full name required",
  "Nom requis": "Name required",
  "Email invalide": "Invalid email",
  "Mot de passe requis": "Password required",
  "Au moins une majuscule": "At least one uppercase letter",
  "Au moins un chiffre": "At least one number",
  "Lettres, chiffres, _ et - uniquement": "Letters, numbers, _ and - only",
  "Confirmation requise": "Confirmation required",
  "Les mots de passe ne correspondent pas": "Passwords do not match",
  "Date de naissance requise": "Date of birth required",
  "Tu dois avoir au moins 16 ans": "You must be at least 16 years old",
  "Pays requis": "Country required",
  "Niveau requis": "Level required",
  "Type de pratique requis": "Practice type required",
  "Au moins un jour": "Select at least one day",
  "Heure de fin requise": "End time required",
  "L'heure de fin doit être après l'heure de début": "End time must be after start time",
  "Heure de fin invalide": "Invalid end time",
  "Tu dois accepter les CGU": "You must accept the Terms",
  "0 caractères maximum": "Maximum 0 characters",
};

/** Returns a localized version of a Zod validation message. */
export function localizeError(
  message: string | undefined,
  language: Language
): string | undefined {
  if (!message) return undefined;
  if (language === "fr") return message;
  return ERROR_MAP[message] ?? message;
}