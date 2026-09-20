// ---------------------------------------------------------------------------
// PULSE SHARED — Native action menu
//
// The single place that knows about OS-level option menus, so every context
// menu in the app (conversations, messages, comments, sort…) gets the real
// system UI instead of a hand-built one:
//
//   - iOS           -> ActionSheetIOS.showActionSheetWithOptions, i.e. the
//                      genuine UIAlertController action sheet: system blur,
//                      separated Cancel button, red destructive rows, and
//                      light/dark styling that follows the app theme.
//   - iOS + Android -> Alert.alert for confirmations, i.e. the native alert
//                      dialog (Android renders it as an AlertDialog).
//   - Web           -> react-native-web exposes neither ActionSheetIOS nor a
//                      working Alert.alert() (it is a no-op), so confirmations
//                      fall back to the browser dialog and the option list is
//                      rendered by <ActionMenuSheet />.
//
// Android has no core React Native API for a list-style options menu (Alert is
// capped at 3 buttons and PopupMenu needs a native module, which would break
// the managed / Expo Go workflow), so Android also uses <ActionMenuSheet />.
// ---------------------------------------------------------------------------

import { ActionSheetIOS, Alert, Platform } from "react-native";

export type ActionMenuOption = {
  /** Stable identifier handed back to the caller when the option is picked. */
  key: string;
  label: string;
  /** Rendered in red by the OS. Use for irreversible actions. */
  destructive?: boolean;
  /** Rendered greyed-out and not tappable by the OS. */
  disabled?: boolean;
};

export type ActionMenuDescriptor = {
  /** Optional header shown above the options (conversation name, author…). */
  title?: string;
  options: ActionMenuOption[];
  /** Label of the OS-provided Cancel button. */
  cancelLabel: string;
  /** iOS only: tints the option titles with the brand color. */
  tintColor?: string;
  /** Keeps the OS menu in the app's theme so it never flashes light in dark. */
  isDark?: boolean;
};

/**
 * `true` only where React Native exposes a genuine OS options menu (iOS).
 * Everywhere else the caller renders <ActionMenuSheet /> instead.
 */
export const hasNativeActionMenu = Platform.OS === "ios";

/**
 * Presents the OS action sheet. `onSelect` is called with the picked option
 * key, and is never called for Cancel or for a disabled option.
 */
export function showNativeActionMenu(
  descriptor: ActionMenuDescriptor,
  onSelect: (key: string) => void
): void {
  const { title, options, cancelLabel, tintColor, isDark } = descriptor;

  // The OS renders the Cancel button as the last row, visually separated.
  const labels = [...options.map((option) => option.label), cancelLabel];
  const cancelButtonIndex = labels.length - 1;

  const destructiveButtonIndex = options.reduce<number[]>(
    (acc, option, index) => (option.destructive ? [...acc, index] : acc),
    []
  );
  const disabledButtonIndices = options.reduce<number[]>(
    (acc, option, index) => (option.disabled ? [...acc, index] : acc),
    []
  );

  ActionSheetIOS.showActionSheetWithOptions(
    {
      ...(title ? { title } : null),
      options: labels,
      cancelButtonIndex,
      ...(destructiveButtonIndex.length ? { destructiveButtonIndex } : null),
      ...(disabledButtonIndices.length ? { disabledButtonIndices } : null),
      ...(tintColor ? { tintColor } : null),
      userInterfaceStyle: isDark ? "dark" : "light",
    },
    (buttonIndex) => {
      // Dismissal by tapping outside also reports the cancel index.
      if (buttonIndex < 0 || buttonIndex >= options.length) return;
      const option = options[buttonIndex];
      if (!option || option.disabled) return;
      onSelect(option.key);
    }
  );
}

export type ConfirmActionOptions = {
  title: string;
  message?: string;
  /** Label of the confirming button (verb, infinitive). */
  confirmLabel: string;
  cancelLabel: string;
  /** Renders the confirming button in red (iOS). */
  destructive?: boolean;
  isDark?: boolean;
};

/**
 * Native confirmation dialog for irreversible actions.
 *
 * Web note: react-native-web's `Alert.alert()` does not display anything, so
 * destructive actions must not rely on it — the browser dialog is used there.
 */
export function confirmAction(options: ConfirmActionOptions, onConfirm: () => void): void {
  const { title, message, confirmLabel, cancelLabel, destructive, isDark } = options;

  if (Platform.OS === "web") {
    const text = message ? `${title}\n\n${message}` : title;
    const canConfirm =
      typeof window !== "undefined" && typeof window.confirm === "function";
    if (!canConfirm || window.confirm(text)) onConfirm();
    return;
  }

  Alert.alert(
    title,
    message,
    [
      { text: cancelLabel, style: "cancel" },
      {
        text: confirmLabel,
        style: destructive ? "destructive" : "default",
        onPress: onConfirm,
      },
    ],
    { userInterfaceStyle: isDark ? "dark" : "light" }
  );
}
