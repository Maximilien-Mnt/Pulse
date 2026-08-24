import { Redirect, Link } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";
import { Image } from "expo-image";
import { useAuthStore } from "@/stores/authStore";
import { useThemeStore } from "@/stores/themeStore";
import { useLanguageStore } from "@/stores/languageStore";
import { useTranslation } from "@/hooks/useTranslation";
import { blue } from "@/src/design-tokens/primitive/colors";

import { SafeScreen } from "@/components/shared/SafeScreen";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { Icon, type IconName } from "@/components/ui/Icon";
import { LandingFooter } from "@/components/landing/LandingFooter";

import { TranslationKey } from "@/lib/translations";

const FEATURES: { icon: IconName; titleKey: TranslationKey; descriptionKey: TranslationKey }[] = [
  {
    icon: "FileText",
    titleKey: "landing.features.posts.title",
    descriptionKey: "landing.features.posts.description",
  },
  {
    icon: "Users",
    titleKey: "landing.features.clubs.title",
    descriptionKey: "landing.features.clubs.description",
  },
  {
    icon: "Calendar",
    titleKey: "landing.features.events.title",
    descriptionKey: "landing.features.events.description",
  },
  {
    icon: "MessageCircle",
    titleKey: "landing.features.messaging.title",
    descriptionKey: "landing.features.messaging.description",
  },
  {
    icon: "Shield",
    titleKey: "landing.features.profiles.title",
    descriptionKey: "landing.features.profiles.description",
  },
  {
    icon: "Activity",
    titleKey: "landing.features.geo.title",
    descriptionKey: "landing.features.geo.description",
  },
];

export default function LandingScreen() {
  const initialized = useAuthStore((s) => s.initialized);
  const userId = useAuthStore((s) => s.userId);
  const isDark = useThemeStore((s) => s.isDark);
  const language = useLanguageStore((s) => s.language);
  const { t } = useTranslation();

  if (initialized && userId) {
    return <Redirect href="/(tabs)/feed" />;
  }

  return (
    <SafeScreen edges={["top"]} className="bg-neutral-50 dark:bg-[#0A0F1E]">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-24">
        {/* ── Header: centered logo + title + toggles at top-right ── */}
        <View className="flex-row items-center justify-between px-6 pt-12 pb-6">
          {/* Invisible spacer matching the toggle width to keep the centered title aligned */}
          <View className="w-11" />

          {/* Centered icon + title */}
          <View className="flex-1 items-center">
            <View className="flex-row items-center justify-center gap-3">
              <View className="w-20 h-20 rounded-2xl bg-primary items-center justify-center overflow-hidden">
                <Image
                  source={require("@/assets/logo/pulse-icon.png")}
                  style={{ width: 56, height: 56 }}
                  contentFit="contain"
                />
              </View>
              <Text variant="h1" className="text-neutral-900 dark:text-neutral-50">
                Pulse
              </Text>
            </View>
          </View>

          {/* ── Toggles (top-right) ────────────────────────────────────── */}
          <View className="items-end gap-2">
            {/* Language toggle */}
            <Pressable
              onPress={() => useLanguageStore.getState().toggle()}
              accessibilityRole="button"
              accessibilityLabel={t("lang.toggle")}
              className="h-11 w-11 items-center justify-center rounded-full bg-white/70 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 active:opacity-70"
            >
              <Text className="text-xs font-bold text-neutral-700 dark:text-neutral-200">
                {language.toUpperCase()}
              </Text>
            </Pressable>

            {/* Theme toggle */}
            <Pressable
              onPress={() => useThemeStore.getState().toggle()}
              accessibilityRole="button"
              accessibilityLabel={isDark ? t("theme.light") : t("theme.dark")}
              className="h-11 w-11 items-center justify-center rounded-full bg-white/70 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 active:opacity-70"
            >
              <Icon name={isDark ? "Sun" : "Moon"} size={20} color="text-secondary" />
            </Pressable>
          </View>
        </View>

        {/* ── Hero section ── */}
        <View className="px-6 py-8 gap-6 items-center">
          <Text variant="display" className="text-center leading-tight">
            {t("landing.hero.title")}
          </Text>

          <Text
            variant="bodyLarge"
            className="text-center text-neutral-600 dark:text-neutral-300 max-w-sm leading-relaxed"
          >
            {t("landing.hero.subtitle")}
          </Text>

          {/* Big, wide, full-width CTA buttons (stacked for mobile UX) */}
          <View className="w-full gap-4 mt-2">
            <Link href="/auth/signup/step1" asChild>
              <Button
                title={t("landing.hero.cta.signup")}
                className="h-14 w-full px-6"
                icon="PlusCircle"
              />
            </Link>
            <Link href="/auth/signin" asChild>
              <Button
                title={t("landing.hero.cta.signin")}
                variant="secondary"
                className="h-14 w-full px-6"
                icon="User"
              />
            </Link>
          </View>

          <Text className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            {t("landing.hero.availability")}
          </Text>
        </View>

        <View className="px-6 py-6 gap-4">
          <Text variant="h2" className="text-neutral-900 dark:text-neutral-50 mb-2">
            {t("landing.features.title")}
          </Text>
          <View className="gap-3">
            {FEATURES.map((feature) => (
              <View
                key={feature.titleKey}
                className="bg-white dark:bg-neutral-800 rounded-2xl p-4 border border-neutral-100 dark:border-neutral-700 gap-3"
              >
                <View className="flex-row items-center gap-3">
                  <View className="h-10 w-10 rounded-full bg-primary/10 items-center justify-center">
                    <Icon name={feature.icon} size={20} color="primary" />
                  </View>
                  <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
                    {t(feature.titleKey)}
                  </Text>
                </View>
                <Text className="text-neutral-700 dark:text-neutral-300 leading-relaxed">
                  {t(feature.descriptionKey)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View className="px-6 py-8">
          <View className="bg-primary dark:bg-primary-dark rounded-2xl p-6 gap-3">
            <Text variant="subtitle" className="text-white font-semibold">
              {t("landing.cta.title")}
            </Text>
            <Text className="text-white/90 dark:text-white/90 leading-relaxed">
              {t("landing.cta.description")}
            </Text>
            <Link href="/auth/signup/step1" asChild>
              <Button
                variant="ghost"
                className="h-14 w-full mt-2 bg-white dark:bg-white"
                icon="PlusCircle"
              >
                <Text variant="buttonLabel" style={{ color: blue[500] }}>
                  {t("landing.cta.button")}
                </Text>
              </Button>
            </Link>
          </View>
        </View>

        {/* ── Footer with all legal documents ── */}
        <LandingFooter />
      </ScrollView>
    </SafeScreen>
  );
}
