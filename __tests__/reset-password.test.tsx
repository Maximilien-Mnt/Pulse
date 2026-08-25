import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import ResetPasswordScreen from "@/app/auth/reset-password";
import { supabase } from "@/lib/supabase";

// Mock Supabase
jest.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      setSession: jest.fn(),
      exchangeCodeForSession: jest.fn(),
      getSession: jest.fn(),
      updateUser: jest.fn(),
      signOut: jest.fn(),
    },
  },
}));

// Mock PostHog
jest.mock("posthog-react-native", () => ({
  usePostHog: () => ({
    capture: jest.fn(),
    identify: jest.fn(),
  }),
}));

// Mock expo-router
jest.mock("expo-router", () => ({
  useRouter: () => ({
    replace: jest.fn(),
    push: jest.fn(),
  }),
  useGlobalSearchParams: () => ({ code: "valid-code" }),
}));

// Mock toast
jest.mock("react-native-toast-message", () => ({
  show: jest.fn(),
}));

// Mock useTranslation
const tMock = (key: string) => {
  const map: Record<string, string> = {
    "auth.resetPassword.title": "Nouveau mot de passe",
    "auth.resetPassword.description": "Choisissez un nouveau mot de passe pour votre compte.",
    "auth.resetPassword.newPassword": "Nouveau mot de passe",
    "auth.resetPassword.confirmPassword": "Confirmer le mot de passe",
    "auth.resetPassword.submit": "Réinitialiser le mot de passe",
    "auth.resetPassword.backToSignin": "Se connecter",
  };
  return map[key] ?? key;
};

jest.mock("@/hooks/useTranslation", () => ({
  useTranslation: () => ({
    t: tMock,
    language: "fr",
  }),
}));

// Mock authStore
jest.mock("@/stores/authStore", () => ({
  useAuthStore: {
    getState: () => ({
      setRecoverySession: jest.fn(),
    }),
  },
}));

describe("ResetPasswordScreen", () => {
  const mockSetSession = supabase.auth.setSession as jest.Mock;
  const mockExchangeCode = supabase.auth.exchangeCodeForSession as jest.Mock;
  const mockGetSession = supabase.auth.getSession as jest.Mock;
  const mockUpdateUser = supabase.auth.updateUser as jest.Mock;
  const mockSignOut = supabase.auth.signOut as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSetSession.mockResolvedValue({ data: { session: null }, error: null });
    mockGetSession.mockResolvedValue({ data: { session: null } });
    // Default: exchange succeeds and returns a session directly
    mockExchangeCode.mockResolvedValue({
      error: null,
      data: { session: { user: { id: "user-123" } } },
    });
  });

  it("shows loading state while establishing recovery session", () => {
    const { getByText } = render(<ResetPasswordScreen />);
    expect(getByText("Vérification de votre lien de réinitialisation…")).toBeTruthy();
  });

  it("renders password inputs after session is established via hash tokens", async () => {
    const originalLocation = window.location;
    // @ts-ignore
    window.location = {
      ...originalLocation,
      hash: "access_token=mock-token&refresh_token=mock-refresh",
    };

    mockSetSession.mockResolvedValueOnce({
      error: null,
      data: { session: { user: { id: "user-123" } } },
    });

    try {
      const { findAllByPlaceholderText } = render(<ResetPasswordScreen />);
      const inputs = await findAllByPlaceholderText("••••••••");
      expect(inputs.length).toBeGreaterThanOrEqual(1);
    } finally {
      // @ts-ignore
      window.location = originalLocation;
    }
  });

  it("shows validation error for weak password", async () => {
    const originalLocation = window.location;
    try {
      // @ts-ignore
      window.location = { ...originalLocation, hash: "" };
    } catch {}

    const { findAllByPlaceholderText, getByText, findByText } = render(<ResetPasswordScreen />);
    const inputs = await findAllByPlaceholderText("••••••••");
    fireEvent.changeText(inputs[0], "weak");
    fireEvent.press(getByText("Réinitialiser le mot de passe"));
    expect(await findByText("Au moins 8 caractères")).toBeTruthy();
  });

  it("shows validation error for password mismatch", async () => {
    const codeData = render(<ResetPasswordScreen />);
    const inputs = await codeData.findAllByPlaceholderText("••••••••");
    fireEvent.changeText(inputs[0], "ValidPass123!");
    fireEvent.changeText(inputs[1], "DifferentPass123!");
    fireEvent.press(codeData.getByText("Réinitialiser le mot de passe"));
    expect(await codeData.findByText("Les mots de passe ne correspondent pas")).toBeTruthy();
  });

  it("calls updateUser with new password on valid submit", async () => {
    mockUpdateUser.mockResolvedValueOnce({ error: null, data: { user: { id: "user-123" } } });
    mockSignOut.mockResolvedValueOnce({ error: null });
    const { findAllByPlaceholderText, getByText } = render(<ResetPasswordScreen />);
    const inputs = await findAllByPlaceholderText("••••••••");
    fireEvent.changeText(inputs[0], "ValidPass123!");
    fireEvent.changeText(inputs[1], "ValidPass123!");
    fireEvent.press(getByText("Réinitialiser le mot de passe"));

    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith({ password: "ValidPass123!" });
    });
  });

  it("calls signOut after successful password update", async () => {
    mockUpdateUser.mockResolvedValueOnce({ error: null, data: { user: { id: "user-123" } } });
    mockSignOut.mockResolvedValueOnce({ error: null });
    const { findAllByPlaceholderText, getByText } = render(<ResetPasswordScreen />);
    const inputs = await findAllByPlaceholderText("••••••••");
    fireEvent.changeText(inputs[0], "ValidPass123!");
    fireEvent.changeText(inputs[1], "ValidPass123!");
    fireEvent.press(getByText("Réinitialiser le mot de passe"));

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
    });
  });

  it("shows error on invalid/expired recovery link", async () => {
    mockExchangeCode.mockReset();
    mockExchangeCode.mockResolvedValueOnce({
      error: { message: "Token expired" },
    });
    mockGetSession.mockResolvedValueOnce({ data: { session: null } });

    const { findByText } = render(<ResetPasswordScreen />);
    expect(await findByText("Lien invalide")).toBeTruthy();
    expect(
      await findByText("Ce lien de réinitialisation est invalide ou a expiré. Veuillez demander un nouveau lien.")
    ).toBeTruthy();
  });

  it("shows error when no recovery session exists after fallback attempts", async () => {
    mockExchangeCode.mockReset();
    mockExchangeCode.mockResolvedValueOnce({ error: { message: "Invalid code" } });
    mockGetSession.mockResolvedValueOnce({ data: { session: null } });
    const { findByText } = render(<ResetPasswordScreen />);
    expect(await findByText("Lien invalide")).toBeTruthy();
    expect(
      await findByText("Ce lien de réinitialisation est invalide ou a expiré. Veuillez demander un nouveau lien.")
    ).toBeTruthy();
  });
});
