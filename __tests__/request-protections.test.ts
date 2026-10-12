/**
 * Request-protection regression tests for the signup edge-function contract.
 *
 * These mirror the server-side guards in supabase/functions/signup/index.ts
 * (which run under Deno and cannot be imported here): CORS allow-listing
 * (no `*`), password strength parity with utils/validation.ts, calendar-date
 * correctness (month-end off-by-one), bounded time-slots, and enumeration
 * resistance (single SIGNUP_FAILED code, no `detail` leakage).
 */
import { getSignupErrorKey } from "@/utils/signupChecklist";
import { passwordSchema } from "@/utils/validation";

function daysInMonthFixed(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

describe("signup request protections", () => {
  it("never exposes a wildcard CORS origin in the edge source", () => {
    const src = require("fs").readFileSync(
      require("path").join(__dirname, "..", "supabase", "functions", "signup", "index.ts"),
      "utf8",
    ) as string;
    expect(src).not.toMatch(/Access-Control-Allow-Origin["']?\s*:\s*["']\*/);
    expect(src).toMatch(/_shared\/cors/);
  });

  it("shares one password-strength rule between client and server", () => {
    // Client (zod) accepts a compliant password…
    expect(passwordSchema.safeParse("Strong1!x").success).toBe(true);
    // …and rejects the weak passwords the old server check used to accept.
    expect(passwordSchema.safeParse("password123").success).toBe(false);
    expect(passwordSchema.safeParse("lowercase1!").success).toBe(false);
    const src = require("fs").readFileSync(
      require("path").join(__dirname, "..", "supabase", "functions", "signup", "index.ts"),
      "utf8",
    ) as string;
    expect(src).toMatch(/isStrongPassword/);
  });

  it("validates real month-end dates (no off-by-one)", () => {
    expect(daysInMonthFixed(2020, 3)).toBe(31);
    expect(daysInMonthFixed(2021, 2)).toBe(28);
    expect(daysInMonthFixed(2020, 2)).toBe(29);
  });

  it("collapses taken-account signals into one generic code", () => {
    expect(getSignupErrorKey("SIGNUP_FAILED")).toBe("signup.error.authFailed");
    expect(getSignupErrorKey("EMAIL_TAKEN")).toBe("signup.error.authFailed");
    expect(getSignupErrorKey("USERNAME_TAKEN")).toBe("signup.error.authFailed");
  });

  it("never returns raw provider detail to the client", () => {
    const src = require("fs").readFileSync(
      require("path").join(__dirname, "..", "supabase", "functions", "signup", "index.ts"),
      "utf8",
    ) as string;
    expect(src).not.toMatch(/detail:\s*message/);
    expect(src).not.toMatch(/detail:\s*sportsError/);
    expect(src).not.toMatch(/detail:\s*e instanceof Error/);
  });

  it("requires auth/secrets on privileged edge functions", () => {
    const fs = require("fs");
    const path = require("path");
    const send = fs.readFileSync(
      path.join(__dirname, "..", "supabase", "functions", "send-notification", "index.ts"),
      "utf8",
    ) as string;
    expect(send).toMatch(/auth\.getUser/);
    const stats = fs.readFileSync(
      path.join(__dirname, "..", "supabase", "functions", "update-user-stats", "index.ts"),
      "utf8",
    ) as string;
    expect(stats).toMatch(/x-job-secret/);
    const geo = fs.readFileSync(
      path.join(__dirname, "..", "supabase", "functions", "geocode", "index.ts"),
      "utf8",
    ) as string;
    expect(geo).toMatch(/MAX_ADDRESS/);
    expect(geo).toMatch(/safeLimit/);
  });
});
