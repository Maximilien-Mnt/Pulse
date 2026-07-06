import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/fr";

dayjs.extend(relativeTime);
dayjs.locale("fr");

/**
 * Formate une date ISO en texte relatif (ex. "il y a 2 heures").
 */
export function formatRelative(iso: string | null | undefined): string {
  if (!iso) return "";
  return dayjs(iso).fromNow();
}

/**
 * Formate une date pour affichage court type fil (ex. "12 mai 2026").
 */
export function formatDateLong(iso: string | null | undefined): string {
  if (!iso) return "";
  return dayjs(iso).format("D MMMM YYYY");
}

/**
 * Heure locale courte.
 */
export function formatTime(iso: string | null | undefined): string {
  if (!iso) return "";
  return dayjs(iso).format("HH:mm");
}

export { dayjs };
