import { translations } from "@/lib/translations";
import type { Language } from "@/stores/languageStore";

/**
 * Maps Zod validation messages emitted by the schemas in `utils/validation.ts`
 * to their localized equivalents.
 *
 * Coordinate with `utils/validation.ts`: the schemas emit *translation keys*
 * (e.g. "validation.minLength8") so messages are not frozen at import time.
 * This helper resolves those keys against `translations` for the current
 * interface language, then falls back to a French → English map so plain French
 * strings (legacy / server-provided messages) still localize for non-French UIs.
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

const TRANSLATION_LOOKUP: Record<Language, Record<string, string>> = {
  fr: Object.fromEntries(Object.entries(translations.fr)),
  en: Object.fromEntries(Object.entries(translations.en)),
};

/** Returns a localized version of a Zod validation message. */
export function localizeError(
  message: string | undefined,
  language: Language = "fr"
): string | undefined {
  if (!message) return undefined;

  // Resolve translation keys (and pass through plain strings, e.g. legacy
  // French messages) against the target language's dictionary.
  const resolved = TRANSLATION_LOOKUP[language][message] ?? message;

  if (language === "fr") return resolved;
  return ERROR_MAP[resolved] ?? resolved;
}