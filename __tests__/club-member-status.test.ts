import fs from "fs";
import path from "path";
import {
  CLUB_MEMBER_STATUS_CATEGORIES,
  CLUB_MEMBER_STATUS_CATEGORY_ORDER,
  CLUB_MEMBER_STATUSES,
  CUSTOM_MEMBER_STATUS_MAX_LENGTH,
  DEFAULT_MEMBER_STATUS,
  getMemberStatusCategory,
  getMemberStatusLabel,
  getMemberStatusSections,
  isManagementStatus,
  isOtherMemberStatus,
  isValidMemberStatus,
  normalizeCustomStatus,
  OTHER_MEMBER_STATUS,
  validateCustomStatus,
} from "@/lib/clubMemberStatus";
import { NOTIFICATION_TYPE_KEYS } from "@/lib/notifications/labels";
import { translations, type TranslationKey } from "@/lib/translations";

// ---------------------------------------------------------------------------
// Club member status — vocabulary, categories, labels and validation
// ---------------------------------------------------------------------------

describe("club member status vocabulary", () => {
  it("exposes unique, snake_case codes", () => {
    const codes = CLUB_MEMBER_STATUSES.map((s) => s.code);
    expect(new Set(codes).size).toBe(codes.length);
    codes.forEach((code) => expect(code).toMatch(/^[a-z][a-z0-9_]*$/));
  });

  it("covers the 7 documented categories plus the free-text 'other'", () => {
    const categories = new Set(CLUB_MEMBER_STATUSES.map((s) => s.category));
    expect(categories).toEqual(
      new Set([
        "management",
        "sports_staff",
        "youth",
        "team",
        "organization",
        "member",
        "support",
      ])
    );
    // The picker renders 7 grouped sections + a trailing custom section.
    expect(getMemberStatusSections()).toHaveLength(7);
    expect(CLUB_MEMBER_STATUS_CATEGORY_ORDER).toHaveLength(8);
    expect(isOtherMemberStatus(OTHER_MEMBER_STATUS)).toBe(true);
    expect(isOtherMemberStatus("player")).toBe(false);
  });

  it("defaults every new member to an active member", () => {
    expect(DEFAULT_MEMBER_STATUS).toBe("active_member");
    expect(isValidMemberStatus(DEFAULT_MEMBER_STATUS)).toBe(true);
    expect(isValidMemberStatus("does_not_exist")).toBe(false);
    expect(isValidMemberStatus(null)).toBe(false);
  });

  it("keeps MANAGEMENT_STATUSES aligned with the 'Direction / gestion' category", () => {
    expect(
      CLUB_MEMBER_STATUSES.filter((s) => s.category === "management").map(
        (s) => s.code
      )
    ).toEqual([
      "president",
      "vice_president",
      "treasurer",
      "secretary",
      "manager",
      "general_manager",
    ]);

    // The SQL helper must never drift from the TS one (migration 058 grants
    // management rights from this exact list).
    const migration = readMigration();
    const arrayBlock = migration.match(
      /management_member_statuses\(\)[\s\S]*?SELECT ARRAY\[([\s\S]*?)\]::text/
    );
    expect(arrayBlock).not.toBeNull();
    const sqlStatuses = ((arrayBlock![1] ?? "").match(/'([a-z_]+)'/g) ?? []).map((s) =>
      s.replace(/'/g, "")
    );
    expect(sqlStatuses).toEqual([
      "president",
      "vice_president",
      "treasurer",
      "secretary",
      "manager",
      "general_manager",
    ]);

    expect(isManagementStatus("president")).toBe(true);
    expect(isManagementStatus("player")).toBe(false);
    expect(isManagementStatus(null)).toBe(false);
  });

  it("declares one distinct icon AND color per category", () => {
    const categories = CLUB_MEMBER_STATUS_CATEGORY_ORDER.map(
      (key) => CLUB_MEMBER_STATUS_CATEGORIES[key]
    );

    // 8 categories (7 + custom) → 8 unique icons and 8 unique colors, so two
    // categories never share the same visual identity.
    expect(new Set(categories.map((c) => c.icon)).size).toBe(categories.length);
    expect(new Set(categories.map((c) => c.iconColor)).size).toBe(
      categories.length
    );
    // Every color is a raw hex (passed through by <Icon />).
    categories.forEach((c) => expect(c.iconColor).toMatch(/^#[0-9A-Fa-f]{6}$/));
  });
});

describe("club member status labels", () => {
  it("ships an FR and an EN label for every status", () => {
    CLUB_MEMBER_STATUSES.forEach(({ code, labelKey }) => {
      expect(typeof translations.fr[labelKey as TranslationKey]).toBe("string");
      expect(typeof translations.en[labelKey as TranslationKey]).toBe("string");
      expect(translations.fr[labelKey as TranslationKey]).not.toBe("");
      expect(translations.en[labelKey as TranslationKey]).not.toBe("");
      // The label key mirrors the code so a rename cannot desync silently.
      expect(labelKey).toBe(`clubMemberStatus.label.${code}`);
    });
  });

  it("ships an FR and an EN label for every category", () => {
    CLUB_MEMBER_STATUS_CATEGORY_ORDER.forEach((key) => {
      const { labelKey } = CLUB_MEMBER_STATUS_CATEGORIES[key];
      expect(typeof translations.fr[labelKey]).toBe("string");
      expect(typeof translations.en[labelKey]).toBe("string");
    });
  });

  it("resolves known codes, free text and unknown codes", () => {
    expect(getMemberStatusLabel("captain", null, tFr)).toBe("Capitaine");

    // Free-text status renders the member's own words…
    expect(
      getMemberStatusLabel(OTHER_MEMBER_STATUS, "  Capitaine fétiche ", tFr)
    ).toBe("Capitaine fétiche");
    // …with the generic label as a fallback.
    expect(getMemberStatusLabel(OTHER_MEMBER_STATUS, null, tFr)).toBe("Autre statut");
    expect(getMemberStatusLabel(OTHER_MEMBER_STATUS, "   ", tFr)).toBe("Autre statut");

    // Unknown / legacy codes never crash the badge.
    expect(getMemberStatusLabel("legacy_status", null, tFr)).toBe("legacy_status");
    expect(getMemberStatusLabel(null, null, tFr)).toBe("");
  });

  it("routes unknown codes to the 'custom' category styling", () => {
    expect(getMemberStatusCategory("captain")).toBe("team");
    expect(getMemberStatusCategory(OTHER_MEMBER_STATUS)).toBe("custom");
    expect(getMemberStatusCategory("legacy_status")).toBe("custom");
    expect(getMemberStatusCategory(null)).toBe("custom");
  });
});

describe("custom ('other') status validation", () => {
  it("requires a non-empty value", () => {
    expect(validateCustomStatus(null)).toBe("customRequired");
    expect(validateCustomStatus("")).toBe("customRequired");
    expect(validateCustomStatus("     ")).toBe("customRequired");
  });

  it("caps at 60 characters", () => {
    expect(validateCustomStatus("x".repeat(CUSTOM_MEMBER_STATUS_MAX_LENGTH))).toBeNull();
    expect(
      validateCustomStatus("x".repeat(CUSTOM_MEMBER_STATUS_MAX_LENGTH + 1))
    ).toBe("customTooLong");
  });

  it("normalizes whitespace before validating", () => {
    expect(normalizeCustomStatus("  capitaine   fétiche  ")).toBe("capitaine fétiche");
    expect(normalizeCustomStatus(null)).toBe("");
    expect(validateCustomStatus("  ok  ")).toBeNull();
    // 60 chars with surrounding spaces must still fit after normalization.
    expect(validateCustomStatus(`  ${"x".repeat(60)}  `)).toBeNull();
  });
});

describe("status change notifications", () => {
  it("maps the new status-change type to an FR and an EN title", () => {
    const key = NOTIFICATION_TYPE_KEYS.club_member_status_changed as TranslationKey;
    expect(key).toBe("notifications.clubMemberStatusChanged.title");
    expect(typeof translations.fr[key]).toBe("string");
    expect(typeof translations.en[key]).toBe("string");
  });

  it("keeps the removal type mapped", () => {
    const key = NOTIFICATION_TYPE_KEYS.club_member_removed as TranslationKey;
    expect(key).toBe("notifications.clubMemberRemoved.title");
    expect(typeof translations.en[key]).toBe("string");
  });
});

// ---------------------------------------------------------------------------

/** Minimal translator: resolves from the FR catalogue (matches `useTranslation`). */
const tFr = (key: TranslationKey) => translations.fr[key] ?? key;

function readMigration(): string {
  // Applied migrations are renamed with a `_(done)` suffix
  // (e.g. 058_club_member_status_(done).sql), so resolve by prefix instead of
  // pinning the filename — otherwise the test breaks the moment the migration
  // is renamed on apply.
  const dir = path.join(__dirname, "..", "supabase", "migrations");
  const matches = fs
    .readdirSync(dir)
    .filter((file) => file.startsWith("058_club_member_status"));

  if (matches.length !== 1) {
    throw new Error(
      `Expected exactly one 058_club_member_status migration, found: ${
        matches.join(", ") || "none"
      }`
    );
  }

  return fs.readFileSync(path.join(dir, matches[0]!), "utf8");
}
