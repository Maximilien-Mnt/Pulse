import { ScrollView, View, TextInput, Keyboard, Platform } from "react-native";
import { useState, useEffect, useRef } from "react";
import { useKeyboardHeight } from "@/lib/keyboardUtils";

type KeyboardAwareScrollViewProps = {
  children: React.ReactNode;
  className?: string;
  contentContainerStyle?: any;
  keyboardShouldPersistTaps?: "never" | "always" | "handled";
};

export function KeyboardAwareScrollView({ 
  children, 
  className, 
  contentContainerStyle,
  keyboardShouldPersistTaps = "handled"
}: KeyboardAwareScrollViewProps) {
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

  // Calculate dynamic padding based on keyboard visibility
  const dynamicPaddingBottom = keyboardHeight > 0 ? keyboardHeight + 20 : 20;

  return (
    <ScrollView
      ref={scrollViewRef}
      className={className}
      contentContainerStyle={{
        ...contentContainerStyle,
        paddingBottom: dynamicPaddingBottom
      }}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
    >
      {children}
    </ScrollView>
  );
}