import {
  COUNTRIES,
  COUNTRIES_EN,
  flagEmoji,
  countryFlag,
  flagEmojiSupported,
  getCountryDisplay,
  __setFlagEmojiSupported,
} from "@/utils/countries";
import { useLanguageStore } from "@/stores/languageStore";

// Pin the canonical French labels for these assertions.
beforeEach(() => {
  useLanguageStore.setState({ language: "fr" } as never);
  __setFlagEmojiSupported(null);
});

afterEach(() => {
  __setFlagEmojiSupported(null);
});

describe("country data", () => {
  it("exposes the full world list (>190 unique ISO countries)", () => {
    expect(COUNTRIES.length).toBeGreaterThanOrEqual(190);
    const codes = COUNTRIES.map((c) => c.code);
    expect(new Set(codes).size).toBe(codes.length);
    expect(codes).toContain("FR");
    expect(codes).toContain("US");
    expect(codes).toContain("JP");
    expect(codes).toContain("BR");
    expect(codes).toContain("AU");
  });

  it("keeps every captured code in the English map as well", () => {
    for (const { code } of COUNTRIES) {
      expect(COUNTRIES_EN[code]).toBeTruthy();
    }
  });
});

describe("flagEmoji", () => {
  it("maps an ISO code to its regional-indicator emoji", () => {
    expect(flagEmoji("FR")).toBe("\u{1F1EB}\u{1F1F7}");
    expect(flagEmoji("us")).toBe("\u{1F1FA}\u{1F1F8}");
  });

  it("returns an empty string for invalid codes", () => {
    expect(flagEmoji("")).toBe("");
    expect(flagEmoji("FRA")).toBe("");
    expect(flagEmoji("F1")).toBe("");
  });
});

describe("countryFlag fallback", () => {
  it("detects support at least once without throwing", () => {
    expect(typeof flagEmojiSupported()).toBe("boolean");
  });

  it("returns the native flag emoji by default (flags supported)", () => {
    __setFlagEmojiSupported(true);
    expect(countryFlag("FR")).toBe("\u{1F1EB}\u{1F1F7}");
  });

  it("falls back to the ISO abbreviation when flags cannot render", () => {
    __setFlagEmojiSupported(false);
    expect(countryFlag("FR")).toBe("FR");
    expect(countryFlag("us")).toBe("US");
  });

  it("returns an empty string for empty or malformed codes even with flags enabled", () => {
    __setFlagEmojiSupported(true);
    expect(countryFlag("")).toBe("");
    expect(countryFlag("FRA")).toBe("");
    expect(countryFlag("F1")).toBe("");
    expect(countryFlag("FRANCE")).toBe("");
  });
});

describe("getCountryDisplay", () => {
  it("composes the native flag emoji and the localized label", () => {
    __setFlagEmojiSupported(true);
    expect(getCountryDisplay("FR")).toBe("\u{1F1EB}\u{1F1F7} France");
    expect(getCountryDisplay("US")).toBe("\u{1F1FA}\u{1F1F8} États-Unis");
  });

  it("replaces the flag with the abbreviation when flags cannot render", () => {
    __setFlagEmojiSupported(false);
    expect(getCountryDisplay("FR")).toBe("FR France");
  });

  it("can render English labels when the interface language is English", () => {
    useLanguageStore.setState({ language: "en" } as never);
    __setFlagEmojiSupported(true);
    expect(getCountryDisplay("FR")).toBe("\u{1F1EB}\u{1F1F7} France");
    expect(getCountryDisplay("BE")).toBe("\u{1F1E7}\u{1F1EA} Belgium");
  });

  it("returns an empty string for empty input", () => {
    expect(getCountryDisplay(undefined)).toBe("");
    expect(getCountryDisplay(null)).toBe("");
  });
});