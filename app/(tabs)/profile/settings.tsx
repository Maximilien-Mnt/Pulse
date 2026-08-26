// PULSE SETTINGS SCREEN
//
// Profile editing, public profile, security, notifications, appearance,
// sign out, and account deletion.
// ---------------------------------------------------------------------------

import { useState } from "react";
import { Pressable, ScrollView, Switch, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { useSignupStore } from "@/stores/signupStore";
import { useProfile } from "@/hooks/useProfile";
import { useThemeStore } from "@/stores/themeStore";

import { Text } from "@/components/ui/Text";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { SafeScreen } from "@/components/shared/SafeScreen";
import { EditProfileSheet } from "@/components/profile/EditProfileSheet";
import { SecuritySection } from "@/components/profile/SecuritySection";
import { DeleteAccountSheet } from "@/components/profile/DeleteAccountSheet";
import { GoPublicSheet } from "@/components/profile/GoPublicSheet";
import { BugReportSheet } from "@/components/shared/BugReportSheet";
import { BackButton } from "@/components/ui/BackButton";

export default function SettingsScreen() {
  const router = useRouter();
  const userId = useAuthStore((s) => s.userId);
  const { data: profile } = useProfile(userId);
  const isDark = useThemeStore((s) => s.isDark);
  const setDark = useThemeStore((s) => s.setDark);

  const [editOpen, setEditOpen] = useState(false);
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

  return (
    <SafeScreen className="flex-1 bg-neutral-50 dark:bg-[#0A0F1E]" edges={["top"]}>
      <View className="flex-row items-center px-4 py-3 border-b border-neutral-100 dark:border-neutral-800">
        <BackButton />
        <Text className="flex-1 text-lg font-bold text-center text-neutral-900 dark:text-neutral-50">
          Paramètres
        </Text>
        <View className="w-11" />
      </View>

      <ScrollView contentContainerClassName="p-4 pb-24">
        {/* Profil */}
        <Text className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 mb-2">
          Profil
        </Text>
        <View className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-100 dark:border-neutral-700 overflow-hidden mb-4">
          <Pressable
            onPress={() => setEditOpen(true)}
            className="flex-row items-center justify-between px-4 py-4 active:opacity-80"
          >
            <View className="flex-row items-center gap-3">
              <Icon name="User" size={20} color="text-secondary" />
              <View>
                <Text className="text-neutral-900 dark:text-neutral-50 font-medium">
                  Modifier le profil
                </Text>
                <Text className="text-xs text-neutral-500 mt-0.5">
                  Nom, bio, ville, photo, objectifs…
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
          </Pressable>

          <View className="h-px bg-neutral-100 dark:bg-neutral-700" />

          {profile?.is_public_profile ? (
            <View className="px-4 py-4">
              <View className="flex-row items-center gap-3">
                <Icon name="CheckCircle2" size={20} color="success" />
                <View>
                  <Text className="text-neutral-900 dark:text-neutral-50 font-medium">
                    Profil public
                  </Text>
                  <Text className="text-xs text-neutral-500 mt-0.5">
                    Ton profil est visible par tous
                  </Text>
                </View>
              </View>
            </View>
          ) : (
            <Pressable
              onPress={() => setGoPublicOpen(true)}
              className="flex-row items-center justify-between px-4 py-4 active:opacity-80"
            >
              <View className="flex-row items-center gap-3">
                <Icon name="UserCircle" size={20} color="text-secondary" />
                <View>
                  <Text className="text-neutral-900 dark:text-neutral-50 font-medium">
                    Passer au profil public
                  </Text>
                  <Text className="text-xs text-neutral-500 mt-0.5">
                    Rendre ton profil visible par tous
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </Pressable>
          )}

          <View className="h-px bg-neutral-100 dark:bg-neutral-700" />

        </View>

        {/* Apparence */}
        <Text className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 mb-2">
          Apparence
        </Text>
        <View className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-100 dark:border-neutral-700 overflow-hidden mb-4">
          <View className="flex-row items-center justify-between px-4 py-4">
            <View className="flex-row items-center gap-3">
              <Icon name="Settings" size={20} color="text-secondary" />
              <Text className="text-neutral-900 dark:text-neutral-50 font-medium">
                Mode sombre
              </Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={setDark}
              trackColor={{ false: "#D3D6DC", true: "#17C982" }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Sécurité */}
        <Text className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 mb-2">
          Sécurité
        </Text>
        <View className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-100 dark:border-neutral-700 overflow-hidden mb-4">
          <SecuritySection email={profile?.email ?? ""} />
        </View>

         {/* Session */}
         <Text className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 mb-2">
           Session
         </Text>
         <Button
           variant="secondary"
           onPress={handleSignOut}
           loading={signingOut}
           className="w-full mb-4"
         >
           Se déconnecter
         </Button>

          {/* Support */}
          <Text className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 mb-2">
            Support
          </Text>
          <Button
            variant="primary"
            onPress={() => setBugReportOpen(true)}
            className="mb-4"
            icon="Bug"
          >
            Signaler un bug
          </Button>

        {/* Juridique */}
        <Text className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 mb-2">
          Juridique
        </Text>
        <View className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-100 dark:border-neutral-700 overflow-hidden mb-4">
          <Pressable
            onPress={() => router.push({ pathname: "/(tabs)/profile/legal", params: { filePath: "01-conditions-utilisation.md", title: "Conditions d'utilisation" } })}
            className="flex-row items-center justify-between px-4 py-4 active:opacity-80"
          >
            <View className="flex-row items-center gap-3">
              <Icon name="FileText" size={20} color="text-secondary" />
              <View>
                <Text className="text-neutral-900 dark:text-neutral-50 font-medium">
                  Conditions d'utilisation
                </Text>
                <Text className="text-xs text-neutral-500 mt-0.5">
                  Règles et conditions du service
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
          </Pressable>

          <View className="h-px bg-neutral-100 dark:bg-neutral-700" />

          <Pressable
            onPress={() => router.push({ pathname: "/(tabs)/profile/legal", params: { filePath: "02-politique-confidentialite.md", title: "Politique de confidentialité" } })}
            className="flex-row items-center justify-between px-4 py-4 active:opacity-80"
          >
            <View className="flex-row items-center gap-3">
              <Icon name="Shield" size={20} color="text-secondary" />
              <View>
                <Text className="text-neutral-900 dark:text-neutral-50 font-medium">
                  Politique de confidentialité
                </Text>
                <Text className="text-xs text-neutral-500 mt-0.5">
                  Données personnelles et vie privée
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
          </Pressable>

          <View className="h-px bg-neutral-100 dark:bg-neutral-700" />

          <Pressable
            onPress={() => router.push({ pathname: "/(tabs)/profile/legal", params: { filePath: "03-signaler-un-bug.md", title: "Comment signaler un problème" } })}
            className="flex-row items-center justify-between px-4 py-4 active:opacity-80"
          >
            <View className="flex-row items-center gap-3">
              <Icon name="FileText" size={20} color="text-secondary" />
              <View>
                <Text className="text-neutral-900 dark:text-neutral-50 font-medium">
                  Comment signaler un problème
                </Text>
                <Text className="text-xs text-neutral-500 mt-0.5">
                  Procédure pour les problèmes techniques
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
          </Pressable>

          <View className="h-px bg-neutral-100 dark:bg-neutral-700" />

          <Pressable
            onPress={() => router.push({ pathname: "/(tabs)/profile/legal", params: { filePath: "04-politique-de-moderation.md", title: "Politique de modération" } })}
            className="flex-row items-center justify-between px-4 py-4 active:opacity-80"
          >
            <View className="flex-row items-center gap-3">
              <Icon name="Users" size={20} color="text-secondary" />
              <View>
                <Text className="text-neutral-900 dark:text-neutral-50 font-medium">
                  Politique de modération
                </Text>
                <Text className="text-xs text-neutral-500 mt-0.5">
                  Règles de communauté et contenu
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
          </Pressable>

          <View className="h-px bg-neutral-100 dark:bg-neutral-700" />

          <Pressable
            onPress={() => router.push({ pathname: "/(tabs)/profile/legal", params: { filePath: "05-mentions-legales.md", title: "Mentions légales" } })}
            className="flex-row items-center justify-between px-4 py-4 active:opacity-80"
          >
            <View className="flex-row items-center gap-3">
              <Icon name="Info" size={20} color="text-secondary" />
              <View>
                <Text className="text-neutral-900 dark:text-neutral-50 font-medium">
                  Mentions légales
                </Text>
                <Text className="text-xs text-neutral-500 mt-0.5">
                  Éditeur et coordonnées
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
          </Pressable>
        </View>

        {/* Zone dangereuse */}
        <Text className="text-sm font-semibold text-error mb-2">
          Zone dangereuse
        </Text>
        <Button
          variant="destructive"
          onPress={() => setDeleteOpen(true)}
          className="w-full"
        >
          Supprimer mon compte
        </Button>

        {/* App version */}
        {appVersion ? (
          <Text className="text-center text-xs text-neutral-400 mt-6 mb-2">
            Version {appVersion}
          </Text>
        ) : null}
      </ScrollView>

      {/* Edit profile sheet */}
      <EditProfileSheet
        visible={editOpen}
        onClose={() => setEditOpen(false)}
        profile={profile ?? null}
      />

      {/* Go public confirmation sheet */}
      <GoPublicSheet visible={goPublicOpen} onClose={() => setGoPublicOpen(false)} />

       {/* Delete account sheet */}
       <DeleteAccountSheet visible={deleteOpen} onClose={() => setDeleteOpen(false)} />

       {/* Bug report sheet */}
       <BugReportSheet visible={bugReportOpen} onClose={() => setBugReportOpen(false)} />
     </SafeScreen>
   );
 }
