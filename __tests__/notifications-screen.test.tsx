// ---------------------------------------------------------------------------
// PULSE — Notifications screen localization tests
//
// Renders the notifications screen with mocked data hooks and checks that:
//   - every visible string follows the active language (FR → EN switch),
//   - unread summaries use plural-aware strings (0 / 1 / many),
//   - stored user-authored body text is preserved verbatim in both languages,
//   - unknown server types fall back to the stored title, then the generic
//     localized label,
//   - accessibility labels are localized.
// ---------------------------------------------------------------------------

import React from "react";
import { render, act } from "@testing-library/react-native";
import ProfileNotificationsScreen from "@/app/(tabs)/profile/notifications";
import { useNotifications, useUnreadNotificationsCount } from "@/hooks/useNotifications";
import { useLanguageStore } from "@/stores/languageStore";
import { translations } from "@/lib/translations";

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));

jest.mock("@/hooks/useNotifications", () => ({
  useNotifications: jest.fn(),
  useMarkAsRead: () => ({ mutateAsync: jest.fn() }),
  useJoinRequestAction: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useUnreadNotificationsCount: jest.fn(),
}));

jest.mock("@/hooks/useStartConversationWith", () => ({
  useStartConversationWith: () => ({ startConversation: jest.fn(), isPending: false }),
}));

jest.mock("react-native-toast-message", () => ({ show: jest.fn() }));

jest.mock("@/components/shared/SafeScreen", () => ({
  SafeScreen: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("@/components/ui/BackButton", () => ({
  BackButton: () => null,
}));

jest.mock("@/components/shared/RefuseJoinRequestSheet", () => ({
  RefuseJoinRequestSheet: () => null,
}));

const notificationsFr = translations.fr;
const notificationsEn = translations.en;

function makeNotification(overrides: Record<string, unknown>) {
  return {
    id: "n1",
    type: "club_join_request",
    body: "Salut, j'adore ce club !",
    created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    read_at: null,
    data: {
      requester_name: "Alice",
      club_id: "c1",
      club_name: "Les Randonneurs",
    },
    ...overrides,
  };
}

const joinRequest = makeNotification({});
const unknownType = makeNotification({
  id: "n2",
  type: "some_new_server_type",
  title: "Serveur dit coucou",
  body: "Message du serveur",
  read_at: new Date().toISOString(),
});
describe("Notifications screen localization", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useLanguageStore.setState({ language: "fr" });
    (useNotifications as jest.Mock).mockReturnValue({
      data: [joinRequest, unknownType],
      isLoading: false,
      refetch: jest.fn(),
    });
    (useUnreadNotificationsCount as jest.Mock).mockReturnValue({ data: 2 });
  });

  it("renders header, filters and plural unread summary in French", () => {
    const { getByText } = render(<ProfileNotificationsScreen />);

    expect(getByText(notificationsFr["common.notifications"])).toBeTruthy();
    expect(getByText(notificationsFr["notifications.filter.all"])).toBeTruthy();
    expect(getByText(notificationsFr["notifications.filter.pending"])).toBeTruthy();
    expect(getByText(notificationsFr["notifications.filter.processed"])).toBeTruthy();
    expect(getByText("2 non lues")).toBeTruthy();
  });

  it("keeps user-authored body text verbatim in French", () => {
    const { getByText } = render(<ProfileNotificationsScreen />);
    expect(getByText("Salut, j'adore ce club !")).toBeTruthy();
  });

  it("falls back to the stored title for unknown server types", () => {
    const { getByText } = render(<ProfileNotificationsScreen />);
    expect(getByText("Serveur dit coucou")).toBeTruthy();
  });

  it("exposes localized accessibility labels on rows", () => {
    const { getAllByRole } = render(<ProfileNotificationsScreen />);
    const rows = getAllByRole("button");
    const row = rows.find((r) =>
      (r.props.accessibilityLabel ?? "").includes(
        notificationsFr["notifications.a11y.unread"]
      )
    );
    expect(row).toBeTruthy();
    expect(row!.props.accessibilityLabel).toContain("Demande d'adhésion");
    expect(row!.props.accessibilityLabel).toContain("Salut, j'adore ce club !");
  });

  it("switches to English after setLanguage('en')", () => {
    const { getByText, rerender } = render(<ProfileNotificationsScreen />);
    expect(getByText(notificationsFr["common.notifications"])).toBeTruthy();

    act(() => {
      useLanguageStore.getState().setLanguage("en");
    });
    rerender(<ProfileNotificationsScreen />);

    expect(getByText(notificationsEn["common.notifications"])).toBeTruthy();
    expect(getByText(notificationsEn["notifications.filter.all"])).toBeTruthy();
    expect(getByText("2 unread")).toBeTruthy();
    // Body text is still the user's own words, untouched by translation.
    expect(getByText("Salut, j'adore ce club !")).toBeTruthy();
  });

  it("hides the unread summary entirely when there are zero unread", () => {
    (useUnreadNotificationsCount as jest.Mock).mockReturnValue({ data: 0 });
    const { queryByText } = render(<ProfileNotificationsScreen />);
    expect(queryByText(notificationsFr["notifications.unread.zero"])).toBeNull();
    expect(queryByText(/non lue/)).toBeNull();
  });

  it("shows the one case of the unread summary", () => {
    (useUnreadNotificationsCount as jest.Mock).mockReturnValue({ data: 1 });
    const { getByText } = render(<ProfileNotificationsScreen />);
    expect(getByText("1 non lue")).toBeTruthy();
  });

  it("renders the localized empty state when there are no notifications", () => {
    (useNotifications as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false,
      refetch: jest.fn(),
    });
    const { getByText } = render(<ProfileNotificationsScreen />);
    expect(getByText(notificationsFr["notifications.empty.all"])).toBeTruthy();
  });
});

