/**
 * `mediaErrorMessage` is the only sanctioned way to turn a media pipeline failure
 * into a toast. `MediaNormalizationError.message` is its *machine code*
 * ("invalidType", "oversized", …), so toasting `err.message` leaks that code to
 * the user — the exact bug this helper exists to prevent.
 *
 * `MediaNormalizationError` is duck-typed here on purpose: importing
 * `lib/mediaPipeline` would pull `expo-image-manipulator` / `expo-file-system`
 * into this suite. The integration with the real class is covered in
 * `mediaPipeline.test.tsx`.
 */
import { mediaErrorMessage } from "@/lib/reporting/userMessage";
import { useLanguageStore } from "@/stores/languageStore";

function mediaError(
  code = "invalidType",
  translationKey = "media.error.invalidType",
  translationParams?: Record<string, string | number>,
): Error {
  const err = new Error(code);
  err.name = "MediaNormalizationError";
  return Object.assign(err, { code, translationKey, translationParams });
}

describe("mediaErrorMessage", () => {
  afterEach(() => {
    useLanguageStore.setState({ language: "fr" });
  });

  it("translates an unsupported-format failure instead of showing the code", () => {
    const err = mediaError();
    expect(err.message).toBe("invalidType");
    expect(mediaErrorMessage(err)).toBe("Format d'image non supporté");
  });

  it("interpolates the byte limit for an oversized image", () => {
    expect(mediaErrorMessage(mediaError("oversized", "media.error.oversized", { mb: 8 }))).toBe(
      "Image trop volumineuse (max 8 Mo)",
    );
  });

  it("follows the active interface language", () => {
    useLanguageStore.setState({ language: "en" });
    expect(mediaErrorMessage(mediaError())).toBe("Unsupported image format");
  });

  it("returns null for anything that is not a media error", () => {
    expect(mediaErrorMessage(new Error("invalidType"))).toBeNull();
    expect(mediaErrorMessage(new TypeError("invalidType"))).toBeNull();
    expect(mediaErrorMessage({ code: "invalidType", name: "MediaNormalizationError" })).toBeNull();
    expect(mediaErrorMessage("invalidType")).toBeNull();
    expect(mediaErrorMessage(null)).toBeNull();
    expect(mediaErrorMessage(undefined)).toBeNull();
  });
});
