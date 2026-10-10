// ---------------------------------------------------------------------------
// PULSE — Message menu tests
//
// The message options menu mirrors the conversations tab contract:
//   - with an anchor (the "⋮" that was clicked / the long-pressed bubble) the
//     Android / web fallback renders as a **floating popover** anchored next
//     to the message (ActionMenuPopover) — clamped so it stays fully visible,
//     and a tap anywhere outside dismisses it,
//   - without one it falls back to the bottom sheet (ActionMenuSheet),
//   - pressing the message's "Message options" button (web) opens the menu,
//     and long-pressing the bubble (native) does too,
//   - picking an option fires its callback.
// iOS uses the genuine OS action sheet (covered in native-action-menu.test.ts).
// ---------------------------------------------------------------------------

import React from "react";
import { Platform } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";

import { MessageBubble } from "@/components/conversations/MessageBubble";
import { MessageMenu } from "@/components/conversations/MessageMenu";

// Force the in-app fallback (Android / web): iOS would show the OS sheet,
// which these tests do not cover here.
jest.mock("@/components/shared/nativeActionMenu", () => ({
  ...jest.requireActual("@/components/shared/nativeActionMenu"),
  hasNativeActionMenu: false,
  showNativeActionMenu: jest.fn(),
}));

jest.mock("@/hooks/useTranslation", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        "common.copy": "Copier",
        "common.edit": "Modifier",
        "common.delete": "Supprimer",
        "common.cancel": "Annuler",
        "common.close": "Fermer",
        "conv.messageDeleteTitle": "Supprimer le message ?",
        "conv.messageDeleteBody": "Cette action est irreversible.",
      };
      return map[key] ?? key;
    },
    language: "fr",
  }),
}));

jest.mock("@/hooks/useReducedMotion", () => ({
  useReducedMotion: () => true,
}));

const anchor = { x: 140, y: 260, width: 24, height: 24 };

const baseProps = {
  visible: true,
  onClose: jest.fn(),
  onCopy: jest.fn(),
  onEdit: jest.fn(),
  onDelete: jest.fn(),
};

describe("MessageMenu presentation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(Platform, "OS", { value: "web", configurable: true });
  });

  it("renders the floating popover anchored to the message", () => {
    const { getByTestId, getByText } = render(
      <MessageMenu {...baseProps} anchor={anchor} />
    );

    expect(getByTestId("action-menu-popover")).toBeTruthy();
    expect(getByText("Copier")).toBeTruthy();
    expect(getByText("Modifier")).toBeTruthy();
    expect(getByText("Supprimer")).toBeTruthy();
  });

  it("fires the picked option's callback", () => {
    const onCopy = jest.fn();
    const { getByTestId } = render(
      <MessageMenu {...baseProps} onCopy={onCopy} anchor={anchor} />
    );

    fireEvent.press(getByTestId("action-menu-option-copy"));
    expect(onCopy).toHaveBeenCalledTimes(1);
  });

  it("closes when tapping outside the floating menu", () => {
    const onClose = jest.fn();
    const { getByLabelText } = render(
      <MessageMenu {...baseProps} onClose={onClose} anchor={anchor} />
    );

    // The full-screen backdrop behind the popover.
    fireEvent.press(getByLabelText("Fermer"));
    expect(onClose).toHaveBeenCalled();
  });

  it("falls back to the bottom sheet when there is no anchor", () => {
    const { queryByTestId, getByText } = render(<MessageMenu {...baseProps} />);

    expect(queryByTestId("action-menu-popover")).toBeNull();
    expect(getByText("Copier")).toBeTruthy();
    // The sheet carries the OS-style separated cancel row.
    expect(getByText("Annuler")).toBeTruthy();
  });
});

describe("MessageBubble options button", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(Platform, "OS", { value: "web", configurable: true });
  });

  it("opens the message options menu from the options button", async () => {
    const { getByLabelText, findByText } = render(
      <MessageBubble text="Hello there" isMine canModify />
    );

    fireEvent.press(getByLabelText("Message options"));

    expect(await findByText("Copier")).toBeTruthy();
  });

  it("opens the message options menu on long-press (native)", async () => {
    Object.defineProperty(Platform, "OS", { value: "android", configurable: true });
    const { getByText, findByText } = render(
      <MessageBubble text="Hello there" isMine canModify />
    );

    fireEvent(getByText("Hello there"), "longPress");

    expect(await findByText("Copier")).toBeTruthy();
  });
});