// PULSE SETTINGS SCREEN
//
// Profile editing, public profile, security, notifications, preferences,
// sign out, and account deletion.
// ---------------------------------------------------------------------------

import { useState } from "react";
import { Pressable, ScrollView, Switch, View } from "react-native";
import { useRouter } from "expo-router";

import Constants from "expo-constants";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { useSignupStore } from "@/stores/signupStore";
import { useProfile } from "@/hooks/useProfile";
import { useThemeStore } from "@/stores/themeStore";
import { useLanguageStore } from "@/stores/languageStore";
import { useTranslation , t } from "@/hooks/useTranslation";

import { Text } from "@/components/ui/Text";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Arrow, useArrowNudge } from "@/components/ui/Arrow";
import { Button } from "@/components/ui/Button";
import { cn } from "@/utils/format";
import { SafeScreen } from "@/components/shared/SafeScreen";
import { SecuritySection } from "@/components/profile/SecuritySection";
import { DeleteAccountSheet } from "@/components/profile/DeleteAccountSheet";
import { GoPublicSheet } from "@/components/profile/GoPublicSheet";
import { BugReportSheet } from "@/components/shared/BugReportSheet";
import { BackButton } from "@/components/ui/BackButton";

/**
 * Standard settings / legal navigation row: leading icon, title + subtitle,
 * and the shared arrow nudge on hover / keyboard focus (the same
 * micro-interaction as the profile screen's notification/settings cards —
 * see components/ui/Arrow.tsx).
 */
function SettingsRow({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: IconName;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  const { active, ...nudge } = useArrowNudge();
  return (
    <Pressable
      {...nudge}
      onPress={onPress}
      className={cn(
        "flex-row items-center justify-between px-4 py-4 active:opacity-80",
        active && "bg-primary-tint dark:bg-primary-tint-dark"
      )}
    >
      <View className="flex-row items-center gap-3">
        <Icon name={icon} size={20} color="text-secondary" />
        <View>
          <Text className="text-neutral-900 dark:text-neutral-50 font-medium">{title}</Text>
          <Text className="text-xs text-neutral-500 mt-0.5">{subtitle}</Text>
        </View>
      </View>
      <Arrow active={active} name="ChevronRight" size={16} color="text-tertiary" />
    </Pressable>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const userId = useAuthStore((s) => s.userId);
  const { data: profile } = useProfile(userId);
  const isDark = useThemeStore((s) => s.isDark);
  const setDark = useThemeStore((s) => s.setDark);
  const language = useLanguageStore((s) => s.language);
  const setLanguage = useLanguageStore((s) => s.setLanguage);
  const { t } = useTranslation();

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [goPublicOpen, setGoPublicOpen] = useState(false);
  const [bugReportOpen, setBugReportOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const appVersion = Constants.expoConfig?.version ?? "";

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await supabase.auth.signOut();
      await useSignupStore.getState().reset();
      router.replace("/auth/signin");
    } catch {
      setSigningOut(false);
    }
  };

  const languageLabel = language === "fr" ? t("common.french") : t("common.english");

  return (
    <SafeScreen className="flex-1 bg-neutral-50 dark:bg-[#0A0F1E]" edges={["top"]}>
      <View className="flex-row items-center px-4 py-3 border-b border-neutral-100 dark:border-neutral-800">
        <BackButton />
        <Text className="flex-1 text-lg font-bold text-center text-neutral-900 dark:text-neutral-50">
          {t("profile.settings")}
        </Text>
        <View className="w-11" />
      </View>

      <ScrollView contentContainerClassName="p-4 pb-24">
        {/* Profile */}
        <Text className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 mb-2">
          {t("settings.section.profile")}
        </Text>
        <View className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-100 dark:border-neutral-700 overflow-hidden mb-4">
          <SettingsRow
            icon="User"
            title={t("settings.editProfile")}
            subtitle={t("settings.editProfileSub")}
            onPress={() => router.push("/(tabs)/profile/edit-profile" as any)}
          />

          <View className="h-px bg-neutral-100 dark:bg-neutral-700" />

          <SettingsRow
            icon="Globe"
            title={t("settings.publicProfile")}
            subtitle={t("settings.publicProfileSub")}
            onPress={() => router.push("/(tabs)/profile/edit-public" as any)}
          />
        </View>

        {/* {t("settings.section.preferences")} */}
        <Text className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 mb-2">
          {t("settings.section.preferences")}
        </Text>
        <View className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-100 dark:border-neutral-700 overflow-hidden mb-4">
          {/* Dark mode toggle */}
          <View className="flex-row items-center justify-between px-4 py-4">
            <View className="flex-row items-center gap-3">
              <Icon name="Settings" size={20} color="text-secondary" />
              <Text className="text-neutral-900 dark:text-neutral-50 font-medium">
                {t("settings.darkMode")}
              </Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={setDark}
              trackColor={{ false: "#D3D6DC", true: "#17C982" }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View className="h-px bg-neutral-100 dark:bg-neutral-700" />

          {/* Language toggle */}
          <Pressable
            onPress={() => setLanguage(language === "fr" ? "en" : "fr")}
            className="flex-row items-center justify-between px-4 py-4 active:opacity-80"
          >
            <View className="flex-row items-center gap-3">
              <Icon name="Globe" size={20} color="text-secondary" />
              <View>
                <Text className="text-neutral-900 dark:text-neutral-50 font-medium">
                  {language === "fr" ? t("common.french") : t("common.english")}
                </Text>
                <Text className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  {t("common.language")}
                </Text>
              </View>
            </View>
            <View className="bg-primary/10 rounded-full px-3 py-1">
              <Text className="text-xs font-bold text-primary" style={{ textTransform: "uppercase" }}>
                {language === "fr" ? "FR" : "EN"}
              </Text>
            </View>
          </Pressable>
        </View>

        {/* {t("security.title")} */}
        <Text className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 mb-2">
          Sécurité
        </Text>
        <View className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-100 dark:border-neutral-700 overflow-hidden mb-4">
          <SecuritySection email={profile?.email ?? ""} />
        </View>

         {/* {t("common.session")} */}
         <Text className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 mb-2">
           Session
         </Text>
         <Button
           variant="secondary"
           onPress={handleSignOut}
           loading={signingOut}
           className="w-full mb-4"
         >
           {t("common.signOut")}
         </Button>

          {/* {t("settings.section.support")} */}
          <Text className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 mb-2">
            Support
          </Text>
          <Button
            variant="primary"
            onPress={() => setBugReportOpen(true)}
            className="mb-4"
            icon="Bug"
          >
            {t("common.reportBug")}
          </Button>

        {/* Juridique */}
        <Text className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 mb-2">
          Juridique
        </Text>
        <View className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-100 dark:border-neutral-700 overflow-hidden mb-4">
          <SettingsRow
            icon="FileText"
            title="Conditions d'utilisation"
            subtitle="Règles et conditions du service"
            onPress={() => router.push({ pathname: "/(tabs)/profile/legal", params: { filePath: "01-conditions-utilisation.md", title: "Conditions d'utilisation" } })}
          />

          <View className="h-px bg-neutral-100 dark:bg-neutral-700" />

          <SettingsRow
            icon="Shield"
            title={t("legal.privacy.title")}
            subtitle={t("legal.privacy.subtitle")}
            onPress={() => router.push({ pathname: "/(tabs)/profile/legal", params: { filePath: "02-politique-confidentialite.md", title: t("legal.privacy.title") } })}
          />

          <View className="h-px bg-neutral-100 dark:bg-neutral-700" />

          <SettingsRow
            icon="FileText"
            title="Politique de cookies"
            subtitle="Gestion des cookies et traceurs"
            onPress={() => router.push({ pathname: "/(tabs)/profile/legal", params: { filePath: "03-politique-cookies.md", title: "Politique de cookies" } })}
          />

          <View className="h-px bg-neutral-100 dark:bg-neutral-700" />

          <SettingsRow
            icon="FileText"
            title={t("bug.report.title")}
            subtitle={t("bug.report.subtitle")}
            onPress={() => router.push({ pathname: "/(tabs)/profile/legal", params: { filePath: "04-politique-de-moderation.md", title: t("legal.moderation.title") } })}
          />

          <View className="h-px bg-neutral-100 dark:bg-neutral-700" />

          <SettingsRow
            icon="Users"
            title={t("legal.moderation.title")}
            subtitle={t("legal.moderation.subtitle")}
            onPress={() => router.push({ pathname: "/(tabs)/profile/legal", params: { filePath: "04-politique-de-moderation.md", title: t("legal.moderation.title") } })}
          />

          <View className="h-px bg-neutral-100 dark:bg-neutral-700" />

          <SettingsRow
            icon="Info"
            title={t("legal.legalNotices.title")}
            subtitle={t("legal.legalNotices.subtitle")}
            onPress={() => router.push({ pathname: "/(tabs)/profile/legal", params: { filePath: "05-mentions-legales.md", title: t("legal.legalNotices.title") } })}
          />
        </View>

        {/* {t("settings.section.danger")} */}
        <Text className="text-sm font-semibold text-error mb-2">
          {t("settings.section.danger")}
        </Text>
        <Button
          variant="destructive"
          onPress={() => setDeleteOpen(true)}
          className="w-full"
        >
          {t("settings.deleteAccount")}
        </Button>

        {/* App version */}
        {appVersion ? (
          <Text className="text-center text-xs text-neutral-400 mt-6 mb-2">
            Version {appVersion}
          </Text>
        ) : null}
      </ScrollView>

      {/* Go public confirmation sheet */}
      <GoPublicSheet visible={goPublicOpen} onClose={() => setGoPublicOpen(false)} />

       {/* Delete account sheet */}
       <DeleteAccountSheet visible={deleteOpen} onClose={() => setDeleteOpen(false)} />

       {/* Bug report sheet */}
       <BugReportSheet visible={bugReportOpen} onClose={() => setBugReportOpen(false)} />
    </SafeScreen>
  );
}


