import "../global.css";
import { queryClient } from "@/lib/queryClient";
import { useThemeStore } from "@/stores/themeStore";
import {
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
  useFonts,
} from "@expo-google-fonts/outfit";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack, usePathname, useGlobalSearchParams } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useRef } from "react";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { View } from "react-native";
import { PostHogProvider } from "posthog-react-native";
import { posthog } from "@/src/config/posthog";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const isDark = useThemeStore((s) => s.isDark);
  const pathname = usePathname();
  const params = useGlobalSearchParams();
  const previousPathname = useRef<string | undefined>(undefined);

  const [loaded] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
  });

  useEffect(() => {
    if (loaded) void SplashScreen.hideAsync();
  }, [loaded]);

  useEffect(() => {
    if (previousPathname.current !== pathname) {
      posthog.screen(pathname, {
        previous_screen: previousPathname.current ?? null,
        ...params,
      });
      previousPathname.current = pathname;
    }
  }, [pathname, params]);

  if (!loaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <PostHogProvider
            client={posthog}
            autocapture={{
              captureScreens: false,
              captureTouches: true,
              propsToCapture: ["testID"],
            }}
          >
            <View className={`flex-1 bg-neutral-50 dark:bg-[#0A0F1E] ${isDark ? "dark" : ""}`}>
              <StatusBar style={isDark ? "light" : "dark"} />
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="auth" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="profile" />
              </Stack>
              <Toast />
            </View>
          </PostHogProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
