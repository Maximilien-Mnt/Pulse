import {
  isValidLink,
  normalizeLink,
  safeDeepLinkPath,
  safeHttpUrl,
  safeIdSegment,
  safeMailto,
  safeTel,
} from "@/utils/links";
import { clubPrivateSchema, clubPublicSchema } from "@/utils/validation";

describe("safeHttpUrl (render-time guard, never rewrites)", () => {
  it("accepts http(s) URLs", () => {
    expect(safeHttpUrl("https://club.example/cal")).toContain("https://club.example/cal");
    expect(safeHttpUrl("  http://localhost:3000/e/1  ")).toContain("http://localhost:3000/e/1");
  });

  it("rejects hostile schemes and scheme-relative URLs", () => {
    expect(safeHttpUrl("javascript:alert(1)")).toBeNull();
    expect(safeHttpUrl("JaVaScRiPt:alert(1)")).toBeNull();
    expect(safeHttpUrl("data:text/html,<script>alert(1)</script>")).toBeNull();
    expect(safeHttpUrl("file:///etc/passwd")).toBeNull();
    expect(safeHttpUrl("pulse:///(tabs)/clubs/abc")).toBeNull();
    expect(safeHttpUrl("//evil.example/phish")).toBeNull();
    expect(safeHttpUrl("not a link at all")).toBeNull();
    expect(safeHttpUrl("")).toBeNull();
    expect(safeHttpUrl(null)).toBeNull();
  });

  it("never prepends https:// (unlike normalizeLink)", () => {
    expect(safeHttpUrl("example.com/inscription")).toBeNull();
    expect(normalizeLink("example.com/inscription")).toBe("https://example.com/inscription");
  });
});

describe("safeMailto / safeTel", () => {
  it("builds mailto only for plain addresses", () => {
    expect(safeMailto("coach@club.lu")).toBe("mailto:coach@club.lu");
    expect(safeMailto("attacker@x.com?subject=hi&body=<script>")).toBeNull();
    expect(safeMailto("javascript:alert(1)")).toBeNull();
    expect(safeMailto("not-an-email")).toBeNull();
  });

  it("builds tel only for plain numbers", () => {
    expect(safeTel("+352 621 123 456")).toBe("tel:+352621123456");
    expect(safeTel("tel:+352621123456")).toBeNull();
    expect(safeTel("123\n456")).toBeNull();
  });
});

describe("safeDeepLinkPath / safeIdSegment (push payloads)", () => {
  it("allows known in-app paths, strips leading slashes", () => {
    expect(safeDeepLinkPath("///clubs/abc/members")).toBe("clubs/abc/members");
    expect(safeDeepLinkPath("events/evt-1")).toBe("events/evt-1");
  });

  it("rejects URLs, traversal and query strings", () => {
    expect(safeDeepLinkPath("https://evil.example")).toBeNull();
    expect(safeDeepLinkPath("javascript:alert(1)")).toBeNull();
    expect(safeDeepLinkPath("../secret")).toBeNull();
    expect(safeDeepLinkPath("clubs/abc?x=1")).toBeNull();
    expect(safeDeepLinkPath("settings/admin")).toBeNull();
  });

  it("accepts UUID/slug ids only", () => {
    expect(safeIdSegment("550e8400-e29b-41d4-a716-446655440000")).toBe("550e8400-e29b-41d4-a716-446655440000");
    expect(safeIdSegment("a/b?c")).toBeNull();
    expect(safeIdSegment("pulse://x")).toBeNull();
  });
});

describe("club URL validation (input layer)", () => {
  it("rejects javascript:/data: URLs in club link fields", () => {
    for (const field of ["website_url", "instagram_url", "facebook_url", "tiktok_url", "extra_link"] as const) {
      for (const hostile of ["javascript:alert(1)", "data:text/html,<script>alert(1)</script>"]) {
        const r = clubPrivateSchema.safeParse({
          name: "Club",
          sport: "running",
          [field]: hostile,
        });
        expect(r.success).toBe(false);
      }
    }
    const r = clubPublicSchema.safeParse({
      name: "Club",
      sport: "running",
      sports: ["running"],
      description: "x".repeat(60),
      country: "LU",
      city: "Luxembourg",
      registration_url: "javascript:alert(1)",
    });
    expect(r.success).toBe(false);
  });

  it("still accepts https links and empty strings", () => {
    const r = clubPrivateSchema.safeParse({
      name: "Club",
      sport: "running",
      website_url: "https://club.example",
      instagram_url: "",
    });
    expect(r.success).toBe(true);
  });
});

// Re-export sanity: form helper behaviour unchanged.
describe("isValidLink unchanged", () => {
  it("still accepts bare hosts (auto-https) but safeHttpUrl does not", () => {
    expect(isValidLink("example.com")).toBe(true);
    expect(safeHttpUrl("example.com")).toBeNull();
  });
});
