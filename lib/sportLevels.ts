/**
 * Per-sport required levels.
 *
 * `required_levels` is the `{ [sportId]: level }` map written by the club/event
 * settings screens; `required_level` is the legacy single value kept in sync
 * with the primary sport (and used by the club list filter). Both are stored,
 * so every display must merge them.
 */

/** Placeholder shown for a practiced sport that has no level configured. */
export const NO_LEVEL = "—";

/** Sports a club/event practices: `sports[]`, else the legacy `sport` column. */
export function practicedSports(
  sports: readonly (string | null | undefined)[] | null | undefined,
  primary?: string | null
): string[] {
  const fromArray = (sports ?? []).filter((s): s is string => typeof s === "string" && s.length > 0);
  if (fromArray.length > 0) return Array.from(new Set(fromArray));
  return primary ? [primary] : [];
}

export type SportLevelRow = {
  /** Sport id from SPORTS. */
  sport: string;
  /** Configured level for that sport, or NO_LEVEL when unset. */
  level: string;
};

/**
 * Builds one row per practiced sport so the "Niveau requis" section lists every
 * sport the club/event does with the level configured for it in settings.
 *
 * `required_level` is used as a fallback: for a single-sport entity (the legacy
 * shape) it is that sport's level; for a multi-sport entity it is only applied
 * when it was never stored in the map, avoiding the same level being repeated
 * on every sport.
 */
export function buildSportLevelRows(
  sports: readonly (string | null | undefined)[] | null | undefined,
  requiredLevels: Record<string, string> | null | undefined,
  requiredLevel?: string | null,
  primary?: string | null
): SportLevelRow[] {
  const list = practicedSports(sports, primary);
  if (list.length === 0) return [];

  const levels = (requiredLevels ?? {}) as Record<string, string>;
  const legacy = (requiredLevel ?? "").trim();
  const hasLegacyInMap = Object.values(levels).some((value) => (value ?? "").trim() === legacy);

  return list.map((sport) => {
    const level = (levels[sport] ?? "").trim();
    if (level) return { sport, level };
    // Legacy single-sport rows stored the level in `required_level` only.
    if (legacy && list.length === 1) return { sport, level: legacy };
    if (legacy && !hasLegacyInMap) return { sport, level: legacy };
    return { sport, level: NO_LEVEL };
  });
}