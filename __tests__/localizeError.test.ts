import { localizeError } from "@/utils/localizeError";

describe("localizeError", () => {
  it("resolves a translation key to French by default", () => {
    expect(localizeError("validation.minLength8")).toBe("8 caractères minimum");
    expect(localizeError("validation.passwordMismatch")).toBe(
      "Les mots de passe ne correspondent pas"
    );
  });

  it("resolves a translation key to English when the language is en", () => {
    expect(localizeError("validation.minLength8", "en")).toBe(
      "Minimum 8 characters"
    );
    expect(localizeError("validation.invalidEmail", "en")).toBe("Invalid email");
    expect(localizeError("validation.passwordMismatch", "en")).toBe(
      "Passwords do not match"
    );
  });

  it("passes plain (non-key) messages through", () => {
    expect(localizeError("Some server error", "fr")).toBe("Some server error");
    expect(localizeError(undefined)).toBeUndefined();
  });

  it("localizes a plain French message to English via the legacy map", () => {
    expect(localizeError("Confirmation requise", "en")).toBe(
      "Confirmation required"
    );
  });
});