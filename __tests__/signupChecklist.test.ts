import { getSignupErrorKey, getSignupMissingFields } from "@/utils/signupChecklist";
import { useSignupStore } from "@/stores/signupStore";

describe("getSignupErrorKey", () => {
  it("maps the machine codes the edge function returns", () => {
    expect(getSignupErrorKey("INVALID_PAYLOAD")).toBe("signup.error.invalidPayload");
    expect(getSignupErrorKey("EMAIL_TAKEN")).toBe("signup.error.emailTaken");
    expect(getSignupErrorKey("USERNAME_TAKEN")).toBe("signup.error.usernameTaken");
    expect(getSignupErrorKey("UNDERAGE")).toBe("signup.error.underage");
  });

  it("still maps legacy raw messages from older deployed functions", () => {
    expect(getSignupErrorKey("Invalid payload")).toBe("signup.error.invalidPayload");
    expect(getSignupErrorKey("User already registered")).toBe("signup.error.emailTaken");
  });

  it("maps client-side network failures", () => {
    expect(getSignupErrorKey("Failed to fetch")).toBe("signup.error.network");
    expect(getSignupErrorKey("Network request failed")).toBe("signup.error.network");
  });

  it("falls back to the generic message for unknown errors", () => {
    expect(getSignupErrorKey("complete garbage")).toBe("signup.error.generic");
    expect(getSignupErrorKey("")).toBe("signup.error.generic");
  });
});

describe("getSignupMissingFields", () => {
  beforeEach(() => {
    useSignupStore.setState({
      step1: {
        language: "fr",
        fullName: "Maximilien Montant",
        username: "maxm",
        email: "max@example.com",
        password: "SuperSecret1",
      },
      step2: { birthDate: new Date("2000-05-10"), country: "LU", city: "Luxembourg" },
      step3: [],
      step3NoSport: false,
      step4: { interestedSports: ["football"], objectives: [] },
      step5: null,
    });
  });

  it("flags the sports step when no sport AND no 'no sport' choice is set", () => {
    const issues = getSignupMissingFields({ acceptTerms: true, acceptPrivacy: true });
    expect(issues.map((i) => i.labelKey)).toContain("signup.missing.sports");
  });

  it("accepts the explicit 'no sport' path even with an empty sport list", () => {
    useSignupStore.setState({ step3NoSport: true });
    const issues = getSignupMissingFields({ acceptTerms: true, acceptPrivacy: true });
    expect(issues.map((i) => i.labelKey)).not.toContain("signup.missing.sports");
    expect(issues.map((i) => i.labelKey)).not.toContain("signup.missing.step1");
    expect(issues.map((i) => i.labelKey)).not.toContain("signup.missing.step2");
    expect(issues.map((i) => i.labelKey)).not.toContain("signup.missing.step4");
    expect(issues).toHaveLength(0);
  });

  it("flags unchecked legal switches", () => {
    const issues = getSignupMissingFields({ acceptTerms: false, acceptPrivacy: true });
    expect(issues.map((i) => i.labelKey)).toContain("signup.missing.terms");
    expect(issues.map((i) => i.labelKey)).not.toContain("signup.missing.privacy");
  });

  it("flags a missing step1/step2/step4 store", () => {
    useSignupStore.setState({ step1: null, step2: null, step4: null });
    const issues = getSignupMissingFields({ acceptTerms: true, acceptPrivacy: true });
    const keys = issues.map((i) => i.labelKey);
    expect(keys).toContain("signup.missing.step1");
    expect(keys).toContain("signup.missing.step2");
    expect(keys).toContain("signup.missing.step4");
  });
});