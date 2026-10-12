import { escapeIlikeTerm } from "@/utils/ilike";

describe("escapeIlikeTerm (search-term hardening)", () => {
  it("passes plain terms through unchanged (aside from trim/cap)", () => {
    expect(escapeIlikeTerm("Luxembourg")).toBe("Luxembourg");
    expect(escapeIlikeTerm("  Esch-sur-Alzette  ")).toBe("Esch-sur-Alzette");
  });

  it("escapes LIKE wildcards so they cannot broaden the match", () => {
    expect(escapeIlikeTerm("%")).toBe("\\%");
    expect(escapeIlikeTerm("a_b")).toBe("a\\_b");
    expect(escapeIlikeTerm("foo%bar")).toBe("foo\\%bar");
    // The escape character itself must be escaped first.
    expect(escapeIlikeTerm("a\\b")).toBe("a\\\\b");
    expect(escapeIlikeTerm("%_\\")).toBe("\\%\\_\\\\");
  });

  it("caps the length to bound the query cost", () => {
    const long = "x".repeat(500);
    expect(escapeIlikeTerm(long)).toHaveLength(60);
  });

  it("returns an empty string for blank input (no wildcard injection)", () => {
    expect(escapeIlikeTerm("")).toBe("");
    expect(escapeIlikeTerm("   ")).toBe("");
  });
});
