import { practicedSports, buildSportLevelRows, NO_LEVEL } from "@/lib/sportLevels";

// ── Which sports a club/event practices ─────────────────────────────────────
describe("practicedSports", () => {
  it("returns every sport of the settings `sports` array, in order", () => {
    expect(practicedSports(["running", "tennis", "yoga"], "tennis")).toEqual([
      "running",
      "tennis",
      "yoga",
    ]);
  });

  it("falls back to the primary `sport` column when the array is empty", () => {
    expect(practicedSports([], "running")).toEqual(["running"]);
    expect(practicedSports(null, "running")).toEqual(["running"]);
  });

  it("returns an empty list when neither is set", () => {
    expect(practicedSports([], null)).toEqual([]);
    expect(practicedSports(undefined, undefined)).toEqual([]);
  });

  it("ignores blanks and duplicates", () => {
    expect(practicedSports(["running", "", null, "running"], undefined)).toEqual(["running"]);
  });
});

// ── "Niveau requis" rows ────────────────────────────────────────────────────
describe("buildSportLevelRows", () => {
  it("returns one row per practiced sport with its configured level", () => {
    const rows = buildSportLevelRows(
      ["running", "tennis"],
      { running: "10 km", tennis: "30/1" },
      "10 km",
      "running"
    );
    expect(rows).toEqual([
      { sport: "running", level: "10 km" },
      { sport: "tennis", level: "30/1" },
    ]);
  });

  it("lists a practiced sport with no level using the placeholder", () => {
    expect(buildSportLevelRows(["running", "tennis"], { running: "10 km" }, null)).toEqual([
      { sport: "running", level: "10 km" },
      { sport: "tennis", level: NO_LEVEL },
    ]);
  });

  it("falls back to the legacy `required_level` for single-sport entities", () => {
    expect(buildSportLevelRows(["running"], null, "Marathon")).toEqual([
      { sport: "running", level: "Marathon" },
    ]);
  });

  it("uses the legacy `required_level` when the map was never populated", () => {
    expect(buildSportLevelRows(["running", "tennis"], null, "Loisir")).toEqual([
      { sport: "running", level: "Loisir" },
      { sport: "tennis", level: "Loisir" },
    ]);
  });

  it("does not repeat the legacy level when it is already in the map", () => {
    const rows = buildSportLevelRows(["running", "tennis"], { running: "Loisir" }, "Loisir");
    expect(rows).toEqual([
      { sport: "running", level: "Loisir" },
      { sport: "tennis", level: NO_LEVEL },
    ]);
  });

  it("returns no rows when the entity has no sport at all", () => {
    expect(buildSportLevelRows([], { running: "10 km" }, "Loisir")).toEqual([]);
  });
});