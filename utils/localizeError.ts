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
  "Au moins 8 caractères": "At least 8 characters",
  "Au moins une majuscule": "At least one uppercase letter",
  "Au moins un chiffre": "At least one number",
  "Un caractère spécial parmi !@#$%^&": "A special character among !@#$%^&",
  "3 caractères minimum": "Minimum 3 characters",
  "30 caractères maximum": "Maximum 30 characters",
  "Lettres, chiffres, _ et - uniquement": "Letters, numbers, _ and - only",
  "Confirmation requise": "Confirmation required",
  "Les mots de passe ne correspondent pas": "Passwords do not match",
  "Date de naissance requise": "Date of birth required",
  "Tu dois avoir au moins 16 ans": "You must be at least 16 years old",
  "Pays requis": "Country required",
  "Sélectionne au moins un sport": "Select at least one sport",
  "Niveau requis": "Level required",
  "Type de pratique requis": "Practice type required",
  "Au moins un jour": "Select at least one day",
  "Heure de début requise": "Start time required",
  "Heure de fin requise": "End time required",
  "L'heure de fin doit être après l'heure de début": "End time must be after start time",
  "Heure de début invalide": "Invalid start time",
  "Heure de fin invalide": "Invalid end time",
  "Tu dois accepter les CGU": "You must accept the Terms",
  "Tu dois accepter la politique de confidentialité": "You must accept the privacy policy",
  "500 caractères maximum": "Maximum 500 characters",
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