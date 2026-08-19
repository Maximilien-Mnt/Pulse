import { View, ScrollView, TextInput, Keyboard, Platform, StyleSheet } from "react-native";
import { useState, useEffect, useRef } from "react";
import { useKeyboardHeight } from "@/lib/keyboardUtils";

type KeyboardAwareFormContainerProps = {
  children: React.ReactNode;
  className?: string;
  contentContainerStyle?: any;
};

export function KeyboardAwareFormContainer({ 
  children, 
  className, 
  contentContainerStyle
}: KeyboardAwareFormContainerProps) {
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
  const dynamicPaddingBottom = keyboardHeight > 0 ? keyboardHeight : 20;

  return (
    <ScrollView
      ref={scrollViewRef}
      className={className}
      contentContainerStyle={{
        ...contentContainerStyle,
        paddingBottom: dynamicPaddingBottom
      }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}