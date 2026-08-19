import { Keyboard, Platform } from "react-native";
import { useState, useEffect } from "react";

/**
 * Dismisses the keyboard programmatically.
 * Safe to call on both iOS and Android.
 */
export function dismissKeyboard() {
  if (Platform.OS !== "web") {
    Keyboard.dismiss();
  }
}

/**
 * Hook to get keyboard visibility state.
 */
export function useKeyboardVisible(): boolean {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (Platform.OS === "web") return;

    const showSubscription = Keyboard.addListener("keyboardDidShow", () => {
      setVisible(true);
    });
    const hideSubscription = Keyboard.addListener("keyboardDidHide", () => {
      setVisible(false);
    });

    return () => {
      showSubscription?.remove();
      hideSubscription?.remove();
    };
  }, []);

  return visible;
}

/**
 * Hook to get keyboard height for manual adjustments.
 */
export function useKeyboardHeight(): number {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (Platform.OS === "web") return;

    const showSubscription = Keyboard.addListener(
      "keyboardDidShow",
      (event: any) => {
        setKeyboardHeight(event.endHeight || event.keyboardHeight || 0);
      }
    );
    const hideSubscription = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription?.remove();
      hideSubscription?.remove();
    };
  }, []);

  return keyboardHeight;
}