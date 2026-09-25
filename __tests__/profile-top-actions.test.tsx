// ---------------------------------------------------------------------------
// PULSE — Profile top actions tests
//
// Renders the personal profile screen with mocked data hooks and checks that:
//   - the notifications + settings entry points live at the top of the
//     screen as round icon buttons over the cover (localized a11y labels),
//   - pressing each navigates to the right route,
//   - each label appears exactly once (the old bottom rows are gone),
//   - the button enters its expanded state on hover/focus and collapses
//     back on hover-out/blur (the width + label-reveal animation is driven
//     by that state).
// ---------------------------------------------------------------------------

import React from "react";
import { fireEvent, render, act } from "@testing-library/react-native";
import ProfileScreen from "@/app/(tabs)/profile/index";
import { usePublicProfile } from "@/hooks/usePublicProfile";
import { useMyClubMemberships } from "@/hooks/useMyClubMemberships";
import { useMyCreatedClubs } from "@/hooks/useMyCreatedClubs";
import { useAuthStore } from "@/stores/authStore";
import { useLanguageStore } from "@/stores/languageStore";
import { translations } from "@/lib/translations";

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
}));

jest.mock("@/hooks/usePublicProfile", () => ({
  usePublicProfile: jest.fn(),
}));

jest.mock("@/hooks/useMyClubMemberships", () => ({
  useMyClubMemberships: jest.fn(),
}));

jest.mock("@/hooks/useMyCreatedClubs", () => ({
  useMyCreatedClubs: jest.fn(),
}));

jest.mock("@/components/shared/SafeScreen", () => ({
  SafeScreen: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("@/components/profile/GoPublicSheet", () => ({
  GoPublicSheet: () => null,
}));

jest.mock("expo-image", () => {
  const { View } = jest.requireActual("react-native");
  return { Image: (props: Record<string, unknown>) => <View {...props} /> };
});

const fr = translations.fr;
const en = translations.en;

const profile = {
  id: "u1",
  full_name: "Alice",
  username: "alice",
  avatar_url: null,
  bio: "",
  is_public_profile: false,
  stats: null,
  sports: [],
  interested_sports: [],
  objectives: [],
};

function setup() {
  useAuthStore.setState({ userId: "u1" } as never);
  (usePublicProfile as jest.Mock).mockReturnValue({
    data: profile,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  });
  (useMyClubMemberships as jest.Mock).mockReturnValue({ data: [], isLoading: false });
  (useMyCreatedClubs as jest.Mock).mockReturnValue({ data: [], isLoading: false });
}

describe("Profile top actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    useLanguageStore.setState({ language: "fr" });
    setup();
  });

  it("renders top round icon buttons for notifications and settings in French", () => {
    const { getByTestId, getByLabelText } = render(<ProfileScreen />);

    expect(getByTestId("profile-top-notifications")).toBeTruthy();
    expect(getByTestId("profile-top-settings")).toBeTruthy();
    expect(getByLabelText(fr["profile.notificationsSection"])).toBeTruthy();
    expect(getByLabelText(fr["profile.settings"])).toBeTruthy();
  });

  it("renders each entry point label exactly once (bottom rows removed)", () => {
    const { getAllByText } = render(<ProfileScreen />);
    expect(getAllByText(fr["profile.notificationsSection"])).toHaveLength(1);
    expect(getAllByText(fr["profile.settings"])).toHaveLength(1);
  });

  it("navigates to the right routes on press", () => {
    const { getByTestId } = render(<ProfileScreen />);

    fireEvent.press(getByTestId("profile-top-notifications"));
    expect(mockPush).toHaveBeenCalledWith("/(tabs)/profile/notifications");

    fireEvent.press(getByTestId("profile-top-settings"));
    expect(mockPush).toHaveBeenCalledWith("/(tabs)/profile/settings");
  });

  it("switches top button labels to English after setLanguage('en')", () => {
    const { getByLabelText, rerender } = render(<ProfileScreen />);
    expect(getByLabelText(fr["profile.settings"])).toBeTruthy();

    act(() => {
      useLanguageStore.getState().setLanguage("en");
    });
    rerender(<ProfileScreen />);

    expect(getByLabelText(en["profile.notificationsSection"])).toBeTruthy();
    expect(getByLabelText(en["profile.settings"])).toBeTruthy();
  });

  it("widens the button when focused (expands accessibility state)", () => {
    // Focus drives the same expanded state as web hover (also the visible
    // keyboard-focus affordance on web); it is not platform-gated.
    const { getByTestId } = render(<ProfileScreen />);

    const button = getByTestId("profile-top-notifications");
    expect(button.props.accessibilityState?.expanded).toBeFalsy();

    fireEvent(button, "focus");
    expect(getByTestId("profile-top-notifications").props.accessibilityState?.expanded).toBe(true);

    fireEvent(button, "blur");
    expect(getByTestId("profile-top-notifications").props.accessibilityState?.expanded).toBeFalsy();
  });
});
