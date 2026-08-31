import type { TranslationKey } from "@/lib/translations";
import { useSignupStore } from "@/stores/signupStore";

/**
 * A single missing/incorrect item preventing account creation.
 * `step` is the signup step the user must visit to resolve it (1-4),
 * or 5 for actions on the final step itself (legal agreements).
 */
export type SignupIssue = {
  step: 1 | 2 | 3 | 4 | 5;
  labelKey: TranslationKey;
};

export type MissingFieldInput = {
  acceptTerms: boolean;
  acceptPrivacy: boolean;
};

/**
 * Returns every missing required piece of the signup as a list of actionable
 * issues. Reads the persisted signup store for steps 1-4 and the live form
 * values for the legal switches on step 5.
 */
export function getSignupMissingFields(input: MissingFieldInput): SignupIssue[] {
  const { step1, step2, step3, step3NoSport, step4 } = useSignupStore.getState();
  const issues: SignupIssue[] = [];

  if (!step1) issues.push({ step: 1, labelKey: "signup.missing.step1" });
  if (!step2) issues.push({ step: 2, labelKey: "signup.missing.step2" });
  // Step 3 is complete if at least one sport was picked OR the explicit
  // "no sport" option was chosen.
  if (step3.length === 0 && !step3NoSport) {
    issues.push({ step: 3, labelKey: "signup.missing.sports" });
  }
  if (!step4) issues.push({ step: 4, labelKey: "signup.missing.step4" });
  if (!input.acceptTerms) issues.push({ step: 5, labelKey: "signup.missing.terms" });
  if (!input.acceptPrivacy) issues.push({ step: 5, labelKey: "signup.missing.privacy" });

  return issues;
}

const SERVER_ERROR_MAP: Readonly<Record<string, TranslationKey>> = {
  // Machine-readable codes returned by supabase/functions/signup/index.ts.
  INVALID_PAYLOAD: "signup.error.invalidPayload",
  EMAIL_TAKEN: "signup.error.emailTaken",
  USERNAME_TAKEN: "signup.error.usernameTaken",
  UNDERAGE: "signup.error.underage",
  // Legacy raw messages (older deployed functions) — still mapped so the
  // client degrades gracefully if the server lags behind.
  "Invalid payload": "signup.error.invalidPayload",
  "User already registered": "signup.error.emailTaken",
  // Client-side network failures.
  "Failed to fetch": "signup.error.network",
  "Network request failed": "signup.error.network",
  // Fallback markers thrown by the client when the response isn't JSON.
  signup_failed: "signup.error.generic",
  signup_invalid_response: "signup.error.generic",
};

/** Maps a server/edge-function error message to a friendly, localized label. */
export function getSignupErrorKey(message: string): TranslationKey {
  return SERVER_ERROR_MAP[message] ?? "signup.error.generic";
}