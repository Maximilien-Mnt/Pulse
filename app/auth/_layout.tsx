import { Stack, useRouter } from "expo-router";
import { useEffect } from "react";
import { BackHandler, Platform } from "react-native";
import { useThemeStore } from "@/stores/themeStore";
import { useLanguageStore } from "@/stores/languageStore";
import { useSignupStore } from "@/stores/signupStore";

export default function AuthLayout() {
  const hydrateTheme = useThemeStore((s) => s.hydrate);
  const hydrateLanguage = useLanguageStore((s) => s.hydrate);
  const hydrateSignup = useSignupStore((s) => s.hydrate);
  const router = useRouter();

  useEffect(() => {
    void hydrateTheme();
    void hydrateLanguage();
    void hydrateSignup();
  }, [hydrateTheme, hydrateLanguage, hydrateSignup]);

  useEffect(() => {
    if (Platform.OS !== "android") return;

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace("/");
        }
        return true;
      },
    );

    return () => subscription.remove();
  }, [router]);

  return <Stack screenOptions={{ headerShown: false }} />;
}
