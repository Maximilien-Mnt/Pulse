import React from "react";
import { render, fireEvent, waitFor, act } from "@testing-library/react-native";
import SignInScreen from "@/app/auth/signin";
import { supabase } from "@/lib/supabase";

// Mock Supabase
jest.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
    },
  },
}));

// Mock PostHog - shared mock references so tests can assert on captures
const mockCapture = jest.fn();
const mockIdentify = jest.fn();

jest.mock("posthog-react-native", () => ({
  usePostHog: () => ({
    capture: mockCapture,
    identify: mockIdentify,
  }),
}));

// Mock expo-router
jest.mock("expo-router", () => ({
  useRouter: () => ({
    replace: jest.fn(),
    push: jest.fn(),
  }),
  Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock toast
jest.mock("react-native-toast-message", () => ({
  show: jest.fn(),
}));

// Mock useTranslation
const tMock = (key: string, variables?: Record<string, string | number>) => {
  const map: Record<string, string> = {
    "auth.signin.title": "Connexion",
    "auth.signin.subtitle": "Connecte-toi pour continuer",
    "auth.signin.email": "Email",
    "auth.signin.password": "Mot de passe",
    "auth.signin.forgotPassword": "Mot de passe oublié ?",
    "auth.signin.submit": "Se connecter",
    "auth.signin.noAccount": "Pas encore de compte ?",
    "auth.signin.signup": "S'inscrire",
    "auth.signin.rateLimited": "Trop de tentatives. Réessayez dans {seconds}s.",
    "auth.signin.rateLimitedTitle": "Connexion ({remaining}s)",
    "common.error": "Une erreur est survenue",
  };
  let result = map[key] ?? key;
  if (variables) {
    Object.entries(variables).forEach(([k, v]) => {
      result = result.replaceAll(`{${k}}`, String(v));
    });
  }
  return result;
};

jest.mock("@/hooks/useTranslation", () => ({
  useTranslation: () => ({
    t: tMock,
    language: "fr",
  }),
}));

// Mock deviceId
jest.mock("@/lib/deviceId", () => ({
  getDeviceId: jest.fn(async () => "device-123"),
}));

// Mock authRateLimit
const mockCheckSignInRateLimit = jest.fn();
const mockRecordSignInFailure = jest.fn();
const mockResetSignInRateLimit = jest.fn();
const mockGetSignInCooldown = jest.fn();

jest.mock("@/lib/authRateLimit", () => ({
  checkSignInRateLimit: (...args: unknown[]) => mockCheckSignInRateLimit(...args),
  recordSignInFailure: (...args: unknown[]) => mockRecordSignInFailure(...args),
  resetSignInRateLimit: (...args: unknown[]) => mockResetSignInRateLimit(...args),
  getSignInCooldown: (...args: unknown[]) => mockGetSignInCooldown(...args),
}));

describe("SignInScreen rate limiting", () => {
  const mockSignInWithPassword = supabase.auth.signInWithPassword as jest.Mock;
  const mockCheckRateLimit = mockCheckSignInRateLimit as jest.Mock;
  const mockRecordFailure = mockRecordSignInFailure as jest.Mock;
  const mockResetRateLimit = mockResetSignInRateLimit as jest.Mock;
  const mockGetCooldown = mockGetSignInCooldown as jest.Mock;
  const mockGetDeviceId = jest.requireMock("@/lib/deviceId").getDeviceId as jest.Mock;

  // Shared counter for rate limit call sequencing
  let rateLimitCallCount = 0;

  beforeEach(() => {
    jest.clearAllMocks();
    rateLimitCallCount = 0;
    mockGetDeviceId.mockResolvedValue("device-123");
    mockGetCooldown.mockReturnValue(0);
    // Reset rate limit mock to clear any leftover state, then set default.
    mockCheckRateLimit.mockReset();
    mockCheckRateLimit.mockImplementation(() => {
      rateLimitCallCount++;
      if (rateLimitCallCount <= 5) return { allowed: true, remainingSeconds: 0 };
      return { allowed: false, remainingSeconds: 900, reason: "device" };
    });
    mockSignInWithPassword.mockResolvedValue({
      data: { session: { user: { id: "user-123" } } },
      error: null,
    });
    mockCapture.mockClear();
    mockIdentify.mockClear();
  });

  it("renders email input, password input, and submit button", () => {
    const { getByLabelText, getByText } = render(<SignInScreen />);
    expect(getByLabelText("Email")).toBeTruthy();
    expect(getByLabelText("Mot de passe")).toBeTruthy();
    expect(getByText("Se connecter")).toBeTruthy();
  });

  it("calls signInWithPassword with email and password on submit", async () => {
    const { getByLabelText, getByText } = render(<SignInScreen />);
    fireEvent.changeText(getByLabelText("Email"), "test@example.com");
    fireEvent.changeText(getByLabelText("Mot de passe"), "ValidPass123!");
    fireEvent.press(getByText("Se connecter"));

    await waitFor(() => {
      expect(mockCheckRateLimit).toHaveBeenCalledWith("device-123", "test@example.com");
    });
    await waitFor(() => {
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "ValidPass123!",
      });
    });
  });

  it("records failure on sign-in error", async () => {
    mockSignInWithPassword.mockResolvedValueOnce({
      error: { message: "Invalid login credentials" },
    });

    const { getByLabelText, getByText } = render(<SignInScreen />);
    fireEvent.changeText(getByLabelText("Email"), "test@example.com");
    fireEvent.changeText(getByLabelText("Mot de passe"), "wrongpassword");
    fireEvent.press(getByText("Se connecter"));

    await waitFor(() => {
      expect(mockRecordFailure).toHaveBeenCalledWith("test@example.com");
    });
  });

  it("resets rate limit on successful sign-in", async () => {
    const { getByLabelText, getByText } = render(<SignInScreen />);
    fireEvent.changeText(getByLabelText("Email"), "test@example.com");
    fireEvent.changeText(getByLabelText("Mot de passe"), "ValidPass123!");
    fireEvent.press(getByText("Se connecter"));

    await waitFor(() => {
      expect(mockResetRateLimit).toHaveBeenCalledWith("test@example.com");
    });
  });

  it("does not call signInWithPassword when already rate limited", async () => {
    mockCheckRateLimit.mockReturnValueOnce({
      allowed: false,
      remainingSeconds: 900,
      reason: "device",
    });

    const { getByLabelText, getByText } = render(<SignInScreen />);
    fireEvent.changeText(getByLabelText("Email"), "test@example.com");
    fireEvent.changeText(getByLabelText("Mot de passe"), "password");
    fireEvent.press(getByText("Se connecter"));

    await waitFor(() => {
      expect(mockSignInWithPassword).not.toHaveBeenCalled();
    });

    expect(mockCapture).toHaveBeenCalledWith(
      "auth.signin.rateLimited",
      expect.objectContaining({ reason: "device" })
    );
  });

  it("blocks sign-in when rate limit is active", async () => {
    // Override default to immediately rate-limit on first call
    mockCheckRateLimit.mockImplementation(() => ({
      allowed: false,
      remainingSeconds: 900,
      reason: "device",
    }));

    const { getByLabelText, getByText } = render(<SignInScreen />);
    fireEvent.changeText(getByLabelText("Email"), "test@example.com");
    fireEvent.changeText(getByLabelText("Mot de passe"), "password");
    fireEvent.press(getByText("Se connecter"));

    await waitFor(() => {
      expect(mockSignInWithPassword).not.toHaveBeenCalled();
    });

    expect(mockCapture).toHaveBeenCalledWith(
      "auth.signin.rateLimited",
      expect.objectContaining({ reason: "device" })
    );
  });
});