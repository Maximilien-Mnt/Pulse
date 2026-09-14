import { redactValue, redactUrl, redactStringSafe } from "@/lib/reporting/redact";

describe("redact", () => {
  it("redacts emails inside free text", () => {
    const out = redactValue("contact john.doe@example.com now") as string;
    expect(out).not.toContain("john.doe@example.com");
    expect(out).toContain("[REDACTED_EMAIL]");
  });

  it("redacts sensitive keys (tokens, passwords)", () => {
    const out = redactValue({ access_token: "abc123", password: "secret", ok: 1 }) as any;
    expect(out.access_token).toBe("[REDACTED_TOKEN]");
    expect(out.password).toBe("[REDACTED_TOKEN]");
    expect(out.ok).toBe(1);
  });

  it("redacts user-generated content keys (message/post bodies)", () => {
    const out = redactValue({ body: "hello world", title: "my post", count: 3 }) as any;
    expect(out.body).toBe("[REDACTED_CONTENT]");
    expect(out.title).toBe("[REDACTED_CONTENT]");
    expect(out.count).toBe(3);
  });

  it("redacts coordinates", () => {
    const out = redactValue({ latitude: 48.85, longitude: 2.35 }) as any;
    expect(out.latitude).toBe("[REDACTED_COORDS]");
    expect(out.longitude).toBe("[REDACTED_COORDS]");
  });

  it("collapses full Supabase payloads (arrays/objects under data)", () => {
    const out = redactValue({ data: [{ id: 1, body: "secret" }] }) as any;
    expect(String(out.data)).not.toContain("secret");
  });

  it("strips query params from urls", () => {
    expect(redactUrl("https://x.supabase.co/rest/v1/posts?select=*&token=abc")).toBe(
      "https://x.supabase.co/rest/v1/posts"
    );
  });

  it("redactStringSafe never throws and handles empty", () => {
    expect(redactStringSafe("")).toBe("Unknown error");
    expect(redactStringSafe(undefined)).toBe("Unknown error");
  });
});
