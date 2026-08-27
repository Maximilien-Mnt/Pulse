import "../global.css";
import { queryClient, restoreQueryCache, persistQueryCache } from "@/lib/queryClient";
import { useThemeStore } from "@/stores/themeStore";
import { useAuthStore } from "@/stores/authStore";
import { useNavbarStore } from "@/stores/navbarStore";

import {
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
  useFonts as useOutfitFonts,
} from "@expo-google-fonts/outfit";
import {
  SpaceGrotesk_500Medium,
  SpaceGrotesk_700Bold,
  useFonts as useSpaceGroteskFonts,
} from "@expo-google-fonts/space-grotesk";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts as useInterFonts,
} from "@expo-google-fonts/inter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack, usePathname, useGlobalSearchParams } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { View } from "react-native";
import { PostHogProvider } from "posthog-react-native";
import { posthog } from "@/src/config/posthog";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useAuth } from "@/hooks/useAuth";
import { markNavigatedInSession } from "@/lib/navigationSession";

SplashScreen.preventAutoHideAsync();

function PushNotificationsGate({ children }: { children: React.ReactNode }) {
  usePushNotifications();
  return children as any;
}

/**
 * Keeps the Supabase auth listener alive for the entire app lifetime.
 *
 * This MUST be mounted at the root layout so the onAuthStateChange
 * subscription never gets torn down (previously it lived in app/index.tsx,
 * which unmounts after navigating into the tabs — leaving the auth store
 * with a stale userId after signing in to a different account).
 */
function AuthGate() {
  useAuth();
  return null;
}

export default function RootLayout() {
  const isDark = useThemeStore((s) => s.isDark);
  // The auth store's `initialized` flag flips to true once the Supabase
  // session has been resolved on startup. The offline cache restore waits
  // for it so the persisted-cache owner check can compare against the real
  // userId instead of the initial null.
  const initialized = useAuthStore((s) => s.initialized);
  const pathname = usePathname();
  const params = useGlobalSearchParams();
  const previousPathname = useRef<string | undefined>(undefined);

  const [outfitLoaded] = useOutfitFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
  });
  const [spaceGroteskLoaded] = useSpaceGroteskFonts({
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
  });
  const [interLoaded] = useInterFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const loaded = outfitLoaded && spaceGroteskLoaded && interLoaded;

  useEffect(() => {
    if (loaded) void SplashScreen.hideAsync();
  }, [loaded]);

  // Hydrate theme preference and navbar layout preference from storage on start.
  useEffect(() => {
    void useThemeStore.getState().hydrate();
    void useNavbarStore.getState().hydrate();
  }, []);

  // Web: apply the `dark` class + color-scheme to <html> so Tailwind's
  // `dark:` variants and the CSS-variable semantic colors (global.css
  // `:root.dark`) actually take effect. React Native Modal portals render
  // into document.body, so the class must live on <html>, not an inner View.
  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    root.style.colorScheme = isDark ? "dark" : "light";
  }, [isDark]);

  // Offline mode: restore cached data once the auth session has been
  // resolved (so the persisted-cache owner check can compare against the
  // real userId), then persist future changes.
  useEffect(() => {
    if (!initialized) return;
    let unsubscribe: (() => void) | undefined;
    void restoreQueryCache().finally(() => {
      unsubscribe = persistQueryCache();
    });
    return () => unsubscribe?.();
  }, [initialized]);


  useEffect(() => {
    if (previousPathname.current !== pathname) {
      // The first committed pathname is the initial load (mount / refresh /
      // deep link) — keep that as "not navigated in this session". Any
      // subsequent change is a genuine in-app navigation.
      if (previousPathname.current !== undefined) {
        markNavigatedInSession();
      }
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
            <AuthGate />
            <PushNotificationsGate>
              <View className={`flex-1 bg-neutral-50 dark:bg-[#0A0F1E] ${isDark ? "dark" : ""}`}>
                <StatusBar style={isDark ? "light" : "dark"} />
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="(public)" />
                  <Stack.Screen name="auth" />
                  <Stack.Screen name="(tabs)" />
                  <Stack.Screen name="profile" />
                  <Stack.Screen name="join" />
                  <Stack.Screen name="create" />
                </Stack>

                <Toast />
              </View>
            </PushNotificationsGate>
          </PostHogProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}