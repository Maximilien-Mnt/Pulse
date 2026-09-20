// ---------------------------------------------------------------------------
// Tests for the native action-menu plumbing (shared/nativeActionMenu.ts)
// ---------------------------------------------------------------------------

import { ActionSheetIOS, Alert, Platform } from "react-native";

jest.mock("@/hooks/useTranslation", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        "common.close": "Fermer",
        "conv.pinConversation": "Épingler",
        "conv.deleteConversation": "Supprimer",
      };
      return map[key] ?? key;
    },
    language: "fr",
  }),
}));

// jest.spyOn replaces the method on the real module object so we can assert
// calls without spreading the entire RN module (which breaks the jest env).
const showActionSheetSpy = jest
  .spyOn(ActionSheetIOS, "showActionSheetWithOptions")
  .mockImplementation(() => 0);

const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => 0);

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { showNativeActionMenu, confirmAction } = require("@/components/shared/nativeActionMenu");


describe("nativeActionMenu.showNativeActionMenu", () => {
  beforeEach(() => {
    showActionSheetSpy.mockClear();
  });

  it("builds iOS labels with options first, cancel last", () => {
    showNativeActionMenu(
      {
        title: "Conversation",
        options: [
          { key: "pin", label: "Épingler" },
          { key: "delete", label: "Supprimer", destructive: true },
        ],
        cancelLabel: "Fermer",
        isDark: true,
      },
      jest.fn()
    );

    expect(showActionSheetSpy).toHaveBeenCalledTimes(1);
        const opts = showActionSheetSpy.mock.calls[0]![0];

    expect(opts.options).toEqual(["Épingler", "Supprimer", "Fermer"]);
    expect(opts.cancelButtonIndex).toBe(2);
    expect(opts.destructiveButtonIndex).toEqual([1]);
    expect(opts.userInterfaceStyle).toBe("dark");
  });

  it("omits destructiveButtonIndex when none are destructive", () => {
    showNativeActionMenu(
      { options: [{ key: "pin", label: "Épingler" }], cancelLabel: "Fermer" },
      jest.fn()
    );

    const opts = showActionSheetSpy.mock.calls[0]![0];
    expect(opts.destructiveButtonIndex).toBeUndefined();
  });

  it("handles multi-destructive as array", () => {
    showNativeActionMenu(
      {
        options: [
          { key: "delete", label: "Supprimer", destructive: true },
          { key: "archive", label: "Archiver" },
          { key: "block", label: "Bloquer", destructive: true },
        ],
        cancelLabel: "Fermer",
      },
      jest.fn()
    );

    const opts = showActionSheetSpy.mock.calls[0]![0];
    expect(opts.destructiveButtonIndex).toEqual([0, 2]);
  });

  it("does not call onSelect for cancel index", () => {
    const onSelect = jest.fn();
    showNativeActionMenu(
      { options: [{ key: "pin", label: "Épingler" }], cancelLabel: "Fermer" },
      onSelect
    );

    const callback = showActionSheetSpy.mock.calls[0]![1] as (index: number) => void;
    callback(1);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("does not call onSelect for a disabled option", () => {
    const onSelect = jest.fn();
    showNativeActionMenu(
      { options: [{ key: "nearby", label: "Proche", disabled: true }], cancelLabel: "Fermer" },
      onSelect
    );

    const callback = showActionSheetSpy.mock.calls[0]![1] as (index: number) => void;
    callback(0);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("calls onSelect with the option key for a valid pick", () => {
    const onSelect = jest.fn();
    showNativeActionMenu(
      {
        options: [
          { key: "pin", label: "Épingler" },
          { key: "delete", label: "Supprimer", destructive: true },
        ],
        cancelLabel: "Fermer",
      },
      onSelect
    );

    const callback = showActionSheetSpy.mock.calls[0]![1] as (index: number) => void;
    callback(1);
    expect(onSelect).toHaveBeenCalledWith("delete");
  });

  it("does not call onSelect for negative buttonIndex (dismiss)", () => {
    const onSelect = jest.fn();
    showNativeActionMenu(
      { options: [{ key: "pin", label: "Épingler" }], cancelLabel: "Fermer" },
      onSelect
    );

    const callback = showActionSheetSpy.mock.calls[0]![1] as (index: number) => void;
    callback(-1);
    expect(onSelect).not.toHaveBeenCalled();
  });
});

describe("nativeActionMenu.confirmAction", () => {
  beforeEach(() => {
    alertSpy.mockClear();
  });

  it("uses Alert.alert on non-web platforms", () => {
    jest.replaceProperty(Platform, "OS", "ios");

    const onConfirm = jest.fn();
    confirmAction(
      {
        title: "Delete",
        message: "Are you sure?",
        confirmLabel: "Delete",
        cancelLabel: "Cancel",
        destructive: true,
      },
      onConfirm
    );

    expect(alertSpy).toHaveBeenCalledTimes(1);
        const args = alertSpy.mock.calls[0]!;
    expect(args[0]).toBe("Delete");
    expect(args[1]).toBe("Are you sure?");
    expect(args[2]![0]!.text).toBe("Cancel");
    expect(args[2]![1]!.text).toBe("Delete");
    expect(args[2]![1]!.style).toBe("destructive");
  });

  it("uses window.confirm on web when confirmed", () => {
    jest.replaceProperty(Platform, "OS", "web");
    const originalWindow = global.window;
    // @ts-ignore
    global.window = { confirm: jest.fn(() => true) } as any;

    const onConfirm = jest.fn();
    confirmAction(
      { title: "Delete", confirmLabel: "Delete", cancelLabel: "Cancel", destructive: true },
      onConfirm
    );

    expect(global.window.confirm).toHaveBeenCalled();
    expect(onConfirm).toHaveBeenCalledTimes(1);

    // @ts-ignore
    global.window = originalWindow;
  });

  it("does not call onConfirm when web user cancels", () => {
    jest.replaceProperty(Platform, "OS", "web");
    const originalWindow = global.window;
    // @ts-ignore
    global.window = { confirm: jest.fn(() => false) } as any;

    const onConfirm = jest.fn();
    confirmAction(
      { title: "Delete", confirmLabel: "Delete", cancelLabel: "Cancel" },
      onConfirm
    );

    expect(global.window.confirm).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();

    // @ts-ignore
    global.window = originalWindow;
  });
});