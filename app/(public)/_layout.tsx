import { Stack } from "expo-router";
import { useEffect } from "react";
import { useThemeStore } from "@/stores/themeStore";
import { useLanguageStore } from "@/stores/languageStore";

export default function PublicLayout() {
  const hydrateTheme = useThemeStore((s) => s.hydrate);
  const hydrateLanguage = useLanguageStore((s) => s.hydrate);

  useEffect(() => {
    void hydrateTheme();
    void hydrateLanguage();
  }, [hydrateTheme, hydrateLanguage]);

  return <Stack screenOptions={{ headerShown: false }} />;
}