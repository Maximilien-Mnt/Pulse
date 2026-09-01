// ---------------------------------------------------------------------------
// PULSE — Club opening hours ("time available")
//
// Pure, framework-free logic for the club weekly opening-hours feature.
// The storage shape intentionally matches user_sports.time_slots:
//   { weekday: 0-6 (Monday-first), startHour, endHour }  — whole hours only.
//
// Everything that touches remote/legacy data goes through sanitizeOpeningHours,
// so the UI and the status computation can trust their inputs.
// ---------------------------------------------------------------------------

export type OpeningHourSlot = {
  /** 0 = Monday … 6 = Sunday (Monday-first, same convention as signup). */
  weekday: number;
  /** Inclusive start hour of the window (local club time). */
  startHour: number;
  /** Exclusive end hour of the window (a club open 6→23 closes at 23:00). */
  endHour: number;
};

export const OPENING_HOURS_MIN_HOUR = 6;
export const OPENING_HOURS_MAX_HOUR = 23;
export const WEEKDAY_COUNT = 7;

const isInt = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v) && Number.isInteger(v);

/**
 * Normalize any unknown value (Supabase jsonb, old app version, manual edit…)
 * into a clean, sorted, deduplicated slot list. Invalid entries are dropped,
 * never thrown — a malformed row can never break the UI.
 */
export function sanitizeOpeningHours(raw: unknown): OpeningHourSlot[] {
  if (!Array.isArray(raw)) return [];

  const seen = new Set<string>();
  const out: OpeningHourSlot[] = [];

  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const { weekday, startHour, endHour } = entry as Record<string, unknown>;
    if (!isInt(weekday) || weekday < 0 || weekday > WEEKDAY_COUNT - 1) continue;
    if (!isInt(startHour) || !isInt(endHour)) continue;
    if (startHour < OPENING_HOURS_MIN_HOUR || endHour > OPENING_HOURS_MAX_HOUR) continue;
    if (endHour <= startHour) continue;

    const key = `${weekday}:${startHour}:${endHour}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ weekday, startHour, endHour });
  }

  return out.sort((a, b) => a.weekday - b.weekday || a.startHour - b.startHour);
}

/** Convert a JS Date to our Monday-first weekday index (0 = Monday). */
export function mondayFirstWeekday(date: Date): number {
  return (date.getDay() + 6) % 7;
}

/** "08:00" style label, consistent with the rest of the app. */
export function formatHour(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

/** Group slots into 7 buckets (Monday-first); missing days are empty arrays. */
export function groupSlotsByWeekday(slots: OpeningHourSlot[]): OpeningHourSlot[][] {
  const buckets: OpeningHourSlot[][] = Array.from(
    { length: WEEKDAY_COUNT },
    () => []
  );
  for (const slot of slots) buckets[slot.weekday]?.push(slot);
  return buckets;
}

export type OpeningStatus = {
  /** Whether the club is open right now. */
  open: boolean;
  /** Hour at which the current window closes (only when open). */
  closesAt?: number;
  /** Hour of the next opening (only when closed and a next window exists). */
  opensAt?: number;
  /** Monday-first weekday of the next opening (0 = today, 1 = tomorrow…). */
  opensWeekday?: number;
};

/**
 * Compute the open/closed status at `now` (defaults to device time).
 * Handles multiple windows per day and rolls over to the following days
 * (up to a full week ahead) to find the next opening.
 */
export function getOpeningStatus(
  slots: OpeningHourSlot[],
  now: Date = new Date()
): OpeningStatus {
  const hours = sanitizeOpeningHours(slots);
  if (hours.length === 0) return { open: false };

  const currentHour = now.getHours();
  const today = mondayFirstWeekday(now);

  // Currently open?
  const current = hours.find(
    (s) => s.weekday === today && s.startHour <= currentHour && currentHour < s.endHour
  );
  if (current) return { open: true, closesAt: current.endHour };

  // Next opening — today first, then the following days (up to +7).
  for (let offset = 0; offset <= WEEKDAY_COUNT; offset++) {
    const weekday = (today + offset) % WEEKDAY_COUNT;
    const daySlots = hours
      .filter((s) => s.weekday === weekday)
      .sort((a, b) => a.startHour - b.startHour);
    const next = daySlots.find((s) => offset > 0 || s.startHour > currentHour);
    if (next) return { open: false, opensAt: next.startHour, opensWeekday: offset };
  }

  return { open: false };
}
