// ---------------------------------------------------------------------------
// PULSE SHARED - SportPill
//
// The single "sport pill" of the app: one rounded-full chip carrying the
// sport brand color (tinted background), its icon and its label.
//
// It is the default way a sport is displayed anywhere a club or an event is
// summarized: explore cards (components/explore/ClubCard / EventCard), the
// club detail identity block and the "Niveau requis" rows. Keeping a single
// implementation guarantees the same height, padding, icon size and label
// style everywhere, so a multi-sport club reads as a row of coherent chips
// rather than a mix of tags and badges.
// ---------------------------------------------------------------------------

import React from "react";
import { View } from "react-native";
import type { IconName } from "@/components/ui/Icon";
import { Icon } from "@/components/ui/Icon";
import { Text } from "@/components/ui/Text";
import { SPORTS } from "@/lib/constants";
import type { SportDefinition } from "@/lib/constants";
import { practicedSports } from "@/lib/sportLevels";

/** Fallback brand color / icon when a stored sport id is unknown to SPORTS. */
const FALLBACK_COLOR = "#3358FF";
const FALLBACK_ICON: IconName = "Trophy";

/** Density of the pill: `md` (detail screens) or `sm` (cards, dense rows). */
export type SportPillSize = "sm" | "md";

export type SportPillProps = {
  /** Sport id from `SPORTS` (falls back gracefully for unknown ids). */
  sport: string;
  /** Optional label override; defaults to the sport label from SPORTS. */
  label?: string;
  /** Pill density. Defaults to `md`. */
  size?: SportPillSize;
  /** Extra classes for the pill container. */
  className?: string;
  /** Test identifier forwarded to the pill container. */
  testID?: string;
};

const SIZES: Record<SportPillSize, { height: number; px: number; icon: number }> = {
  sm: { height: 24, px: 10, icon: 12 },
  md: { height: 30, px: 12, icon: 14 },
};

/** Resolve a sport id to its definition in SPORTS, if any. */
export function getSportDefinition(sport: string): SportDefinition | undefined {
  return SPORTS.find((s) => s.id === sport);
}

/** Human-readable label for a sport id (falls back to the raw id). */
export function getSportLabel(sport: string): string {
  return getSportDefinition(sport)?.label ?? sport;
}

/**
 * Default sport pill: tinted background in the sport brand color, the sport
 * icon and its label in the same color.
 */
export function SportPill({ sport, label, size = "md", className, testID }: SportPillProps) {
  const definition = getSportDefinition(sport);
  const color = definition?.color ?? FALLBACK_COLOR;
  const iconName: IconName = definition?.icon ?? FALLBACK_ICON;
  const text = label ?? definition?.label ?? sport;
  const dims = SIZES[size];

  return (
    <View
      testID={testID}
      accessibilityLabel={text}
      className={`flex-row items-center gap-1.5 rounded-full ${className ?? ""}`}
      style={{
        height: dims.height,
        paddingHorizontal: dims.px,
        backgroundColor: `${color}15`,
      }}
    >
      <Icon name={iconName} size={dims.icon} color={color} />
      <Text variant="caption" className="font-semibold" style={{ color }} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

export type SportPillsProps = {
  /** Sport ids to render, in order. Duplicates and blanks are ignored. */
  sports: readonly (string | null | undefined)[];
  /** Pill density. Defaults to `sm` (cards). */
  size?: SportPillSize;
  /** Extra classes for the wrapping row. */
  className?: string;
  /** Test identifier for the wrapping row. */
  testID?: string;
};

/**
 * Normalizes a club/event sport list: `sports[]` first, falling back to the
 * single `sport` column (primary sport) when the array is empty or missing.
 * Re-exported from lib/sportLevels so cards and detail screens share the one
 * definition of "which sports does this entity practice".
 */
export const normalizeSports = practicedSports;

/** Wrapping row of sport pills - the canonical multi-sport display. */
export function SportPills({ sports, size = "sm", className, testID }: SportPillsProps) {
  const unique = Array.from(
    new Set(sports.filter((s): s is string => typeof s === "string" && s.length > 0))
  );
  if (unique.length === 0) return null;
  return (
    <View testID={testID} className={`flex-row flex-wrap items-center gap-1.5 ${className ?? ""}`}>
      {unique.map((sport) => (
        <SportPill key={sport} sport={sport} size={size} />
      ))}
    </View>
  );
}