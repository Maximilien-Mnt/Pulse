import { View, ScrollView, TextInput, Keyboard, Platform } from "react-native";
import { useState, useEffect, useRef } from "react";
import { useKeyboardHeight } from "@/lib/keyboardUtils";

type KeyboardAwareFormProps = {
  children: React.ReactNode;
  className?: string;
};

export function KeyboardAwareForm({ children, className }: KeyboardAwareFormProps) {
  const keyboardHeight = useKeyboardHeight();
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (Platform.OS === "web") return;

    const showSubscription = Keyboard.addListener("keyboardDidShow", () => {
      setIsKeyboardVisible(true);
    });
    const hideSubscription = Keyboard.addListener("keyboardDidHide", () => {
      setIsKeyboardVisible(false);
    });

    return () => {
      showSubscription?.remove();
      hideSubscription?.remove();
    };
  }, []);

  // This component will handle the keyboard positioning
  // The actual positioning logic will be handled in the parent forms
  return (
    <View className={className}>
      {children}
    </View>
  );
}