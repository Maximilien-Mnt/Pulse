import type { IconName } from "@/components/ui/Icon";
import type { TranslationKey } from "@/lib/translations";

// ---------------------------------------------------------------------------
// Club member status — single source of truth
// ---------------------------------------------------------------------------
// A club member has TWO distinct concepts:
//
//   1. `role` (owner / admin / member) — TECHNICAL permission role used by RLS
//      and permission helpers. Never displayed as a status.
//   2. `member_status` + `custom_member_status` — the HUMAN-facing status inside
//      the club (Président, Coach, Joueur, Bénévole…), rendered as a badge.
//
// This module is the only place where the vocabulary, its categories, colors
// and icons are defined. The DB CHECK constraint only validates the `other`
// custom value; membership in the vocabulary itself is enforced by the app.
//
// ⚠ Keep `MANAGEMENT_STATUSES` in sync with
//   `management_member_statuses()` in supabase/migrations/058_club_member_status.sql.
// ---------------------------------------------------------------------------

export type ClubMemberStatusCategoryKey =
  | "management"
  | "sports_staff"
  | "youth"
  | "team"
  | "organization"
  | "member"
  | "support"
  | "custom";

export interface ClubMemberStatusCategory {
  readonly labelKey: TranslationKey;
  readonly icon: IconName;
  /** Raw hex — also passed through by `Icon` (see IconColor doc). */
  readonly iconColor: string;
  /** Badge container class + text class (light / dark). */
  readonly badgeClass: string;
  readonly textClass: string;
}

/**
 * One distinct icon AND one distinct color per category.
 * Colors are hand-picked hexes (the token palette has no purple/teal/rose) and
 * every combination is checked for readable contrast on its own tint.
 */
export const CLUB_MEMBER_STATUS_CATEGORIES: Record<
  ClubMemberStatusCategoryKey,
  ClubMemberStatusCategory
> = {
  management: {
    labelKey: "clubMemberStatus.category.management",
    icon: "Crown",
    iconColor: "#B8860B",
    badgeClass: "bg-[#FBF0CF] dark:bg-[#3A2E11]",
    textClass: "text-[#7A5F14] dark:text-[#EFC94C]",
  },
  sports_staff: {
    labelKey: "clubMemberStatus.category.sports_staff",
    icon: "Dumbbell",
    iconColor: "#2563EB",
    badgeClass: "bg-primary/10",
    textClass: "text-primary",
  },
  youth: {
    labelKey: "clubMemberStatus.category.youth",
    icon: "Users",
    iconColor: "#0D9488",
    badgeClass: "bg-[#D3F3EE] dark:bg-[#0E312D]",
    textClass: "text-[#0F766E] dark:text-[#5EEAD4]",
  },
  team: {
    labelKey: "clubMemberStatus.category.team",
    icon: "Trophy",
    iconColor: "#16A34A",
    badgeClass: "bg-[#D8F6E3] dark:bg-[#10301D]",
    textClass: "text-[#15803D] dark:text-[#7FE6A6]",
  },
  organization: {
    labelKey: "clubMemberStatus.category.organization",
    icon: "Calendar",
    iconColor: "#EA580C",
    badgeClass: "bg-[#FDE6CE] dark:bg-[#3A230F]",
    textClass: "text-[#B8480B] dark:text-[#FBB06A]",
  },
  member: {
    labelKey: "clubMemberStatus.category.member",
    icon: "User",
    iconColor: "#64748B",
    badgeClass: "bg-neutral-100 dark:bg-neutral-700",
    textClass: "text-neutral-600 dark:text-neutral-300",
  },
  support: {
    labelKey: "clubMemberStatus.category.support",
    icon: "Heart",
    iconColor: "#E11D48",
    badgeClass: "bg-[#FCE0E6] dark:bg-[#3B1720]",
    textClass: "text-[#BE123C] dark:text-[#FB8DA0]",
  },
  custom: {
    labelKey: "clubMemberStatus.category.custom",
    icon: "Ellipsis",
    iconColor: "#6B7280",
    badgeClass: "bg-neutral-100 dark:bg-neutral-700",
    textClass: "text-neutral-600 dark:text-neutral-300",
  },
};

/** Picker section order (custom "Autre" always last). */
export const CLUB_MEMBER_STATUS_CATEGORY_ORDER: readonly ClubMemberStatusCategoryKey[] = [
  "management",
  "sports_staff",
  "youth",
  "team",
  "organization",
  "member",
  "support",
  "custom",
];

/** The 'other' (free-text) status code. */
export const OTHER_MEMBER_STATUS = "other" as const;
/** Default status for every new member (`member_status` column default). */
export const DEFAULT_MEMBER_STATUS = "active_member" as const;
export const CUSTOM_MEMBER_STATUS_MAX_LENGTH = 60;

/**
 * Statuses that grant membership-management rights (the "Direction / gestion"
 * category). Mirrors `management_member_statuses()` in SQL.
 */
export const MANAGEMENT_STATUSES: readonly string[] = [
  "president",
  "vice_president",
  "treasurer",
  "secretary",
  "manager",
  "general_manager",
];

// ---------------------------------------------------------------------------
// Vocabulary
// ---------------------------------------------------------------------------

export const CLUB_MEMBER_STATUSES = [
  // — Direction / gestion —
  { code: "president", category: "management", labelKey: "clubMemberStatus.label.president" },
  { code: "vice_president", category: "management", labelKey: "clubMemberStatus.label.vice_president" },
  { code: "treasurer", category: "management", labelKey: "clubMemberStatus.label.treasurer" },
  { code: "secretary", category: "management", labelKey: "clubMemberStatus.label.secretary" },
  { code: "manager", category: "management", labelKey: "clubMemberStatus.label.manager" },
  { code: "general_manager", category: "management", labelKey: "clubMemberStatus.label.general_manager" },

  // — Encadrement sportif —
  { code: "head_coach", category: "sports_staff", labelKey: "clubMemberStatus.label.head_coach" },
  { code: "assistant_coach", category: "sports_staff", labelKey: "clubMemberStatus.label.assistant_coach" },
  { code: "coach", category: "sports_staff", labelKey: "clubMemberStatus.label.coach" },
  { code: "technical_director", category: "sports_staff", labelKey: "clubMemberStatus.label.technical_director" },
  { code: "fitness_coach", category: "sports_staff", labelKey: "clubMemberStatus.label.fitness_coach" },
  { code: "goalkeeping_coach", category: "sports_staff", labelKey: "clubMemberStatus.label.goalkeeping_coach" },
  { code: "referee", category: "sports_staff", labelKey: "clubMemberStatus.label.referee" },
  { code: "trainer", category: "sports_staff", labelKey: "clubMemberStatus.label.trainer" },
  { code: "scout", category: "sports_staff", labelKey: "clubMemberStatus.label.scout" },

  // — Encadrement jeunesse —
  { code: "youth_coach", category: "youth", labelKey: "clubMemberStatus.label.youth_coach" },
  { code: "youth_supervisor", category: "youth", labelKey: "clubMemberStatus.label.youth_supervisor" },
  { code: "educator", category: "youth", labelKey: "clubMemberStatus.label.educator" },
  { code: "mentor", category: "youth", labelKey: "clubMemberStatus.label.mentor" },

  // — Équipe / compétition —
  { code: "captain", category: "team", labelKey: "clubMemberStatus.label.captain" },
  { code: "vice_captain", category: "team", labelKey: "clubMemberStatus.label.vice_captain" },
  { code: "player", category: "team", labelKey: "clubMemberStatus.label.player" },
  { code: "goalkeeper", category: "team", labelKey: "clubMemberStatus.label.goalkeeper" },
  { code: "starter", category: "team", labelKey: "clubMemberStatus.label.starter" },
  { code: "substitute", category: "team", labelKey: "clubMemberStatus.label.substitute" },
  { code: "veteran", category: "team", labelKey: "clubMemberStatus.label.veteran" },
  { code: "rookie", category: "team", labelKey: "clubMemberStatus.label.rookie" },

  // — Organisation —
  { code: "event_manager", category: "organization", labelKey: "clubMemberStatus.label.event_manager" },
  { code: "volunteer_coordinator", category: "organization", labelKey: "clubMemberStatus.label.volunteer_coordinator" },
  { code: "communications_manager", category: "organization", labelKey: "clubMemberStatus.label.communications_manager" },
  { code: "sponsorship_manager", category: "organization", labelKey: "clubMemberStatus.label.sponsorship_manager" },
  { code: "recruitment_manager", category: "organization", labelKey: "clubMemberStatus.label.recruitment_manager" },
  { code: "marketing_manager", category: "organization", labelKey: "clubMemberStatus.label.marketing_manager" },
  { code: "social_media_manager", category: "organization", labelKey: "clubMemberStatus.label.social_media_manager" },
  { code: "facilities_manager", category: "organization", labelKey: "clubMemberStatus.label.facilities_manager" },
  { code: "logistics_manager", category: "organization", labelKey: "clubMemberStatus.label.logistics_manager" },

  // — Membres —
  { code: "founder", category: "member", labelKey: "clubMemberStatus.label.founder" },
  { code: "co_founder", category: "member", labelKey: "clubMemberStatus.label.co_founder" },
  { code: "active_member", category: "member", labelKey: "clubMemberStatus.label.active_member" },
  { code: "honorary_member", category: "member", labelKey: "clubMemberStatus.label.honorary_member" },
  { code: "legend", category: "member", labelKey: "clubMemberStatus.label.legend" },
  { code: "member", category: "member", labelKey: "clubMemberStatus.label.member" },
  { code: "new_member", category: "member", labelKey: "clubMemberStatus.label.new_member" },
  { code: "former_member", category: "member", labelKey: "clubMemberStatus.label.former_member" },

  // — Soutien —
  { code: "supporter", category: "support", labelKey: "clubMemberStatus.label.supporter" },
  { code: "sponsor", category: "support", labelKey: "clubMemberStatus.label.sponsor" },
  { code: "partner", category: "support", labelKey: "clubMemberStatus.label.partner" },
  { code: "staff", category: "support", labelKey: "clubMemberStatus.label.staff" },
] as const satisfies readonly {
  code: string;
  category: ClubMemberStatusCategoryKey;
  labelKey: TranslationKey;
}[];

/** Union of every valid `member_status` value. */
export type ClubMemberStatus = (typeof CLUB_MEMBER_STATUSES)[number]["code"];

type StatusEntry = (typeof CLUB_MEMBER_STATUSES)[number];
export type TranslateFn = (key: TranslationKey, variables?: Record<string, string | number>) => string;

const STATUS_BY_CODE: ReadonlyMap<string, StatusEntry> = new Map(
  CLUB_MEMBER_STATUSES.map((entry) => [entry.code as string, entry])
);

// ---------------------------------------------------------------------------
// Lookups
// ---------------------------------------------------------------------------

/** Returns the vocabulary entry, or `undefined` for unknown/missing values. */
export function getMemberStatusEntry(
  code: string | null | undefined
): StatusEntry | undefined {
  if (!code) return undefined;
  return STATUS_BY_CODE.get(code);
}

/**
 * Category of a status code — also the one used for the badge color/icon.
 * Unknown codes (legacy / foreign rows) fall back to `custom`.
 */
export function getMemberStatusCategory(
  code: string | null | undefined
): ClubMemberStatusCategoryKey {
  if (code === OTHER_MEMBER_STATUS) return "custom";
  return getMemberStatusEntry(code)?.category ?? "custom";
}

export function getMemberStatusCategoryStyle(
  code: string | null | undefined
): ClubMemberStatusCategory {
  return CLUB_MEMBER_STATUS_CATEGORIES[getMemberStatusCategory(code)];
}

export function isOtherMemberStatus(code: string | null | undefined): boolean {
  return code === OTHER_MEMBER_STATUS;
}

/** `true` when the status is one of the "Direction / gestion" statuses. */
export function isManagementStatus(code: string | null | undefined): boolean {
  return !!code && MANAGEMENT_STATUSES.includes(code);
}

export function isValidMemberStatus(code: string | null | undefined): boolean {
  return !!code && STATUS_BY_CODE.has(code);
}

export function getStatusesForCategory(
  category: ClubMemberStatusCategoryKey
): readonly StatusEntry[] {
  if (category === "custom") return [];
  return CLUB_MEMBER_STATUSES.filter((entry) => entry.category === category);
}

/** Statuses grouped by category, in picker order (custom section omitted). */
export function getMemberStatusSections(): {
  category: ClubMemberStatusCategoryKey;
  labelKey: TranslationKey;
  statuses: readonly StatusEntry[];
}[] {
  return CLUB_MEMBER_STATUS_CATEGORY_ORDER.filter((c) => c !== "custom").map(
    (category) => ({
      category,
      labelKey: CLUB_MEMBER_STATUS_CATEGORIES[category].labelKey,
      statuses: getStatusesForCategory(category),
    })
  );
}

// ---------------------------------------------------------------------------
// Labels + validation
// ---------------------------------------------------------------------------

/**
 * Display label: the translated vocabulary label for a known code, the raw
 * custom text for `other`, or the code itself as a safe fallback.
 */
export function getMemberStatusLabel(
  code: string | null | undefined,
  customStatus: string | null | undefined,
  t: TranslateFn
): string {
  if (isOtherMemberStatus(code)) {
    const custom = customStatus?.trim();
    if (custom) return custom;
    return t(`clubMemberStatus.label.${OTHER_MEMBER_STATUS}`);
  }

  const entry = getMemberStatusEntry(code);
  if (!entry) return code ?? "";
  return t(entry.labelKey);
}

export function normalizeCustomStatus(value: string | null | undefined): string {
  return (value ?? "").trim().replace(/\s+/g, " ");
}

/** Validation for the free-text status (`other`). `null` means valid. */
export function validateCustomStatus(
  value: string | null | undefined
): "customRequired" | "customTooLong" | null {
  const normalized = normalizeCustomStatus(value);
  if (!normalized) return "customRequired";
  if (normalized.length > CUSTOM_MEMBER_STATUS_MAX_LENGTH) return "customTooLong";
  return null;
}


