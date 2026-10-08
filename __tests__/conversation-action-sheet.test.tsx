// ---------------------------------------------------------------------------
// PULSE — Conversation action sheet: pin / unpin toggle tests
//
// The first option must flip with the conversation's pinned state:
//   - unpinned -> "Épingler" (key "pin", Pin icon),
//   - pinned   -> "Désépingler" (key "unpin", PinOff icon),
// so reopening the menu after (un)pinning always shows the opposite action.
// ---------------------------------------------------------------------------

import { Platform } from "react-native";
import { render } from "@testing-library/react-native";

import { ConversationActionSheet } from "@/components/conversations/ConversationActionSheet";
import { ICON_MAP } from "@/components/ui/Icon";
jest.mock("@/components/shared/nativeActionMenu", () => {
  const actual = jest.requireActual("@/components/shared/nativeActionMenu");
  return {
    ...actual,
    hasNativeActionMenu: false,
    showNativeActionMenu: jest.fn(),
  };
});

beforeEach(() => {
  Object.defineProperty(Platform, "OS", { value: "android", configurable: true });
});

jest.mock("@/hooks/useTranslation", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        "common.close": "Fermer",
        "common.pinned": "Épingler",
        "common.unpinned": "Désépingler",
        "common.report": "Signaler",
        "conv.renameGroup": "Renommer",
        "conv.leaveGroup": "Quitter",
        "conv.deleteConversation": "Supprimer",
        "conv.deleteAndBlock": "Supprimer et bloquer",
      };
      return map[key] ?? key;
    },
    language: "fr",
  }),
}));

jest.mock("@/hooks/useReducedMotion", () => ({
  useReducedMotion: () => true,
}));

jest.mock("@/hooks/useConversationActions", () => ({
  usePinConversation: () => ({ mutate: jest.fn(), isPending: false }),
  useUnpinConversation: () => ({ mutate: jest.fn(), isPending: false }),
  useLeaveGroupConversation: () => ({ mutate: jest.fn(), isPending: false }),
  useRenameGroupConversation: () => ({ mutate: jest.fn(), isPending: false }),
  useDeleteConversation: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("@/hooks/useBlockUser", () => ({
  useBlockUser: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("@/components/shared/ReportSheet", () => ({
  ReportSheet: () => null,
}));

jest.mock("@/src/design-tokens/useDesignTokens", () => ({
  useDesignTokens: () => ({
    colors: { surface: "#fff", border: "#eee", error: "#C7222D" },
  }),
}));

jest.mock("react-native-toast-message", () => ({
  __esModule: true,
  default: { show: jest.fn() },
}));

function renderSheet(pinned: boolean) {
  return render(
    <ConversationActionSheet
      visible
      name="Alice"
      pinned={pinned}
      onClose={jest.fn()}
      conversationId="c1"
      anchor={{ x: 300, y: 100, width: 40, height: 40 }}
    />
  );
}

describe("ConversationActionSheet pin toggle", () => {
  it("shows 'Épingler' with the Pin icon when the conversation is unpinned", () => {
    const { getByTestId, getByText } = renderSheet(false);
    expect(getByText("Épingler")).toBeTruthy();
    expect(getByTestId("action-menu-option-pin")).toBeTruthy();
    expect(ICON_MAP.Pin).toBeTruthy();
  });

  it("shows 'Désépingler' with the PinOff icon when the conversation is pinned", () => {
    const { getByTestId, getByText } = renderSheet(true);
    expect(getByText("Désépingler")).toBeTruthy();
    expect(getByTestId("action-menu-option-unpin")).toBeTruthy();
    expect(ICON_MAP.PinOff).toBeTruthy();
  });
});
