/**
 * Shared signup birth-date logic.
 *
 * This is the SINGLE source of truth for birth-date validation and age
 * computation used by:
 *   - `utils/validation.ts` (client-side zod schema for step 2)
 *   - `utils/signupPayload.ts` (payload serialization)
 *   - `utils/signup.ts` (completeSignup replay)
 *
 * It mirrors EXACTLY the rules in `supabase/functions/signup/index.ts`
 * (`isValidDate` + `calculateAge`): a `YYYY-MM-DD` string, math done in UTC,
 * with the same invalid-calendar-date rejection (e.g. Feb 30). Keeping one
 * copy guarantees the client and the edge function can never disagree about
 * whether a date is valid or how old a user is (timezone boundaries included).
 */

export const MIN_AGE = 16;

/** True only for a structurally valid calendar date `YYYY-MM-DD`. */
export function isValidBirthDateISO(dateStr: string): boolean {
  if (typeof dateStr !== "string") return false;
  const d = new Date(dateStr + "T00:00:00Z");
  if (isNaN(d.getTime())) return false;
  const parts = dateStr.split("-");
  if (parts.length !== 3) return false;
  const y = parseInt(parts[0]!, 10);
  const m = parseInt(parts[1]!, 10);
  const day = parseInt(parts[2]!, 10);
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(day)) return false;
  if (m < 1 || m > 12) return false;
  const daysInMonth = new Date(Date.UTC(y, m - 1, 0)).getUTCDate();
  if (day < 1 || day > daysInMonth) return false;
  return true;
}

/** Whole years between a `YYYY-MM-DD` birth date and "today", computed in UTC. */
export function calculateAgeFromISO(birthDateStr: string, now: Date = new Date()): number {
  const bd = new Date(birthDateStr + "T00:00:00Z");
  let age = now.getUTCFullYear() - bd.getUTCFullYear();
  const m = now.getUTCMonth() - bd.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < bd.getUTCDate())) age -= 1;
  return age;
}

export function isUnderageFromISO(birthDateStr: string, now: Date = new Date()): boolean {
  return calculateAgeFromISO(birthDateStr, now) < MIN_AGE;
}

/**
 * Renders a Date (or ISO string) as the exact `YYYY-MM-DD` the user SAW in the
 * date picker, so the sent birthdate always matches what was displayed —
 * independent of the device timezone. The edge function + age math then work
 * on that stable string in UTC.
 */
export function toBirthDateISO(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}