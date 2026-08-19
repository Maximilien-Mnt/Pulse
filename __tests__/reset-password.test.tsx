import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import ResetPasswordScreen from "@/app/auth/reset-password";
import { supabase } from "@/lib/supabase";

// Mock Supabase
jest.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
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

// Mock authStore
jest.mock("@/stores/authStore", () => ({
  useAuthStore: {
    getState: () => ({
      setRecoverySession: jest.fn(),
    }),
  },
}));

describe("ResetPasswordScreen", () => {
  const mockExchangeCode = supabase.auth.exchangeCodeForSession as jest.Mock;
  const mockGetSession = supabase.auth.getSession as jest.Mock;
  const mockUpdateUser = supabase.auth.updateUser as jest.Mock;
  const mockSignOut = supabase.auth.signOut as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    // Default: session is established
    mockExchangeCode.mockResolvedValueOnce({ error: null });
    mockGetSession.mockResolvedValueOnce({
      data: { session: { user: { id: "user-123" } } },
    });
  });

  it("shows loading state while establishing recovery session", () => {
    const { getByText } = render(<ResetPasswordScreen />);
    expect(getByText("Vérification de votre lien de réinitialisation…")).toBeTruthy();
  });

  it("renders password inputs after session is established", async () => {
    const { findByPlaceholderText } = render(<ResetPasswordScreen />);
    expect(await findByPlaceholderText("••••••••")).toBeTruthy();
  });

  it("shows validation error for weak password", async () => {
    const { findByPlaceholderText, getByText, findByText } = render(<ResetPasswordScreen />);
    const input = await findByPlaceholderText("••••••••");
    fireEvent.changeText(input, "weak");
    fireEvent.press(getByText("Réinitialiser le mot de passe"));
    expect(await findByText("Au moins 8 caractères")).toBeTruthy();
  });

  it("shows validation error for password mismatch", async () => {
    const { findAllByPlaceholderText, getByText, findByText } = render(<ResetPasswordScreen />);
    const inputs = await findAllByPlaceholderText("••••••••");
    // First input is password, second is confirmPassword
    fireEvent.changeText(inputs[0], "ValidPass123!");
    fireEvent.changeText(inputs[1], "DifferentPass123!");
    fireEvent.press(getByText("Réinitialiser le mot de passe"));
    expect(await findByText("Les mots de passe ne correspondent pas")).toBeTruthy();
  });

  it("calls updateUser with new password on valid submit", async () => {
    mockUpdateUser.mockResolvedValueOnce({ error: null });
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
    mockUpdateUser.mockResolvedValueOnce({ error: null });
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
      await findByText("Ce lien de réinitialisation est invalide ou a expiré.")
    ).toBeTruthy();
  });

  it("shows error when no recovery session exists (no code, no session)", async () => {
    // Re-mock to simulate no code
    jest.resetModules();
    jest.doMock("expo-router", () => ({
      useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
      useGlobalSearchParams: () => ({}), // no code
    }));

    mockGetSession.mockResolvedValueOnce({ data: { session: null } });

    const { findByText } = render(<ResetPasswordScreen />);
    expect(await findByText("Lien invalide")).toBeTruthy();
  });
});
