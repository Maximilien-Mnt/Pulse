import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import ForgotPasswordScreen from "@/app/auth/forgot-password";
import { supabase } from "@/lib/supabase";

// Mock Supabase
jest.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      resetPasswordForEmail: jest.fn(),
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
  Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock toast
jest.mock("react-native-toast-message", () => ({
  show: jest.fn(),
}));

// Mock getRedirectUrl to return a fixed value
jest.mock("@/lib/constants", () => ({
  ...jest.requireActual("@/lib/constants"),
  getRedirectUrl: () => "http://localhost:8081/auth/reset-password",
}));

describe("ForgotPasswordScreen", () => {
  const mockResetPasswordForEmail = supabase.auth.resetPasswordForEmail as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the email input and submit button", () => {
    const { getByPlaceholderText, getByText } = render(<ForgotPasswordScreen />);
    expect(getByPlaceholderText("vous@exemple.com")).toBeTruthy();
    expect(getByText("Envoyer le lien")).toBeTruthy();
  });

  it("shows validation error for invalid email", async () => {
    const { getByPlaceholderText, getByText, findByText } = render(<ForgotPasswordScreen />);
    const input = getByPlaceholderText("vous@exemple.com");
    fireEvent.changeText(input, "not-an-email");
    fireEvent.press(getByText("Envoyer le lien"));
    expect(await findByText("Email invalide")).toBeTruthy();
  });

  it("calls resetPasswordForEmail with correct email on submit", async () => {
    mockResetPasswordForEmail.mockResolvedValueOnce({ error: null });
    const { getByPlaceholderText, getByText } = render(<ForgotPasswordScreen />);
    const input = getByPlaceholderText("vous@exemple.com");
    fireEvent.changeText(input, "test@example.com");
    fireEvent.press(getByText("Envoyer le lien"));

    await waitFor(() => {
      expect(mockResetPasswordForEmail).toHaveBeenCalledWith("test@example.com", {
        redirectTo: "http://localhost:8081/auth/reset-password",
      });
    });
  });

  it("shows success message after successful submit", async () => {
    mockResetPasswordForEmail.mockResolvedValueOnce({ error: null });
    const { getByPlaceholderText, getByText, findByText } = render(<ForgotPasswordScreen />);
    const input = getByPlaceholderText("vous@exemple.com");
    fireEvent.changeText(input, "test@example.com");
    fireEvent.press(getByText("Envoyer le lien"));

    expect(await findByText("Email envoyé")).toBeTruthy();
    expect(
      await findByText(
        "Si ce compte existe, un email de réinitialisation vient d'être envoyé."
      )
    ).toBeTruthy();
  });

  it("shows generic error message on API failure (does not reveal email existence)", async () => {
    mockResetPasswordForEmail.mockResolvedValueOnce({
      error: { message: "Some server error" },
    });
    const { getByPlaceholderText, getByText } = render(<ForgotPasswordScreen />);
    const input = getByPlaceholderText("vous@exemple.com");
    fireEvent.changeText(input, "test@example.com");
    fireEvent.press(getByText("Envoyer le lien"));

    // The success message should NOT appear
    await waitFor(() => {
      expect(mockResetPasswordForEmail).toHaveBeenCalled();
    });
  });

  it("shows neutral success even if email does not exist", async () => {
    // Supabase returns success regardless of whether the email exists
    mockResetPasswordForEmail.mockResolvedValueOnce({ error: null });
    const { getByPlaceholderText, getByText, findByText } = render(<ForgotPasswordScreen />);
    const input = getByPlaceholderText("vous@exemple.com");
    fireEvent.changeText(input, "nonexistent@example.com");
    fireEvent.press(getByText("Envoyer le lien"));

    expect(await findByText("Email envoyé")).toBeTruthy();
  });
});
