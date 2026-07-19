import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { supabase } from "@/lib/supabase";
import { LANGUAGES } from "@/lib/constants";
import { useAuthStore } from "@/stores/authStore";
import { useThemeStore } from "@/stores/themeStore";
import { useProfile, useUpdateProfile } from "@/hooks/useProfile";
import { ProfileClubsSection } from "@/components/profile/ProfileClubsSection";
import { ProfileEventsSection } from "@/components/profile/ProfileEventsSection";
import { SecuritySection } from "@/components/profile/SecuritySection";
import { EditProfileSheet } from "@/components/profile/EditProfileSheet";
import { DeleteAccountSheet } from "@/components/profile/DeleteAccountSheet";
import dayjs from "dayjs";
import { useQuery, type QueryObserverResult } from "@tanstack/react-query";
import type { UserSport } from "@/types";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { usePostHog } from "posthog-react-native";

export default function ProfileScreen() {
  const router = useRouter();
  const posthog = usePostHog();
  const userId = useAuthStore((s) => s.userId);
  const { data: profile, isLoading, isError, error, refetch } = useProfile(userId);
  const updateMut = useUpdateProfile(userId);
  const isDark = useThemeStore((s) => s.isDark);
  const setDark = useThemeStore((s) => s.setDark);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data: sports = [] } = useQuery({
    queryKey: ["my-sports", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("user_sports").select("*").eq("user_id", userId!);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: objectives = [] } = useQuery({
    queryKey: ["my-objectives", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("user_objectives").select("*").eq("user_id", userId!);
      if (error) throw error;
      return data ?? [];
    },
  });

  const signOut = async () => {
    posthog.capture("user_signed_out");
    posthog.reset();
    await supabase.auth.signOut();
    router.replace("/auth/signin");
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-neutral-50 dark:bg-[#0A0F1E]">
        <Text>Chargement…</Text>
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-neutral-50 dark:bg-[#0A0F1E] px-6">
        <Text className="text-center mb-3 text-neutral-900 dark:text-neutral-50">
          {error instanceof Error ? error.message : "Erreur de chargement"}
        </Text>
        <Button title="Réessayer" onPress={() => void refetch()} />
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-neutral-50 dark:bg-[#0A0F1E] px-6">
        <Text className="text-center mb-3 text-neutral-900 dark:text-neutral-50">
          Profil introuvable. Crée d’abord la ligne profiles pour cet utilisateur.
        </Text>
        <Button title="Réessayer" onPress={() => void refetch()} />
      </SafeAreaView>
    );
  }

  const age = profile.birth_date ? dayjs().diff(dayjs(profile.birth_date), "year") : null;

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-[#0A0F1E]" edges={["top"]}>
      <ScrollView contentContainerClassName="px-4 pb-24 pt-4">
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">Mon Profil</Text>
          <Button title="Modifier" variant="ghost" onPress={() => setEditOpen(true)} />
        </View>

        <View className="items-center">
          <Avatar uri={profile.avatar_url} size={80} className="border-2 border-primary" />
          <Text className="text-2xl font-bold mt-3 text-neutral-900 dark:text-neutral-50">{profile.full_name}</Text>
          <Text className="text-neutral-500">@{profile.username}</Text>
        </View>

        <Card className="mt-6 p-4">
          <Text className="text-lg font-semibold mb-2">Infos personnelles</Text>
          <Text className="text-neutral-700 dark:text-neutral-200">Bio : {profile.bio ?? "—"}</Text>
          <Text className="text-neutral-700 dark:text-neutral-200 mt-1">Pays : {profile.country ?? "—"}</Text>
          <Text className="text-neutral-700 dark:text-neutral-200">Ville : {profile.city ?? "—"}</Text>
          <Text className="text-neutral-700 dark:text-neutral-200">Âge : {age ?? "—"}</Text>
          <Text className="text-neutral-700 dark:text-neutral-200">Langue : {profile.language}</Text>
          {profile.height_cm ? (
            <Text className="text-neutral-700 dark:text-neutral-200">Taille : {profile.height_cm} cm</Text>
          ) : null}
          {profile.weight_kg ? (
            <Text className="text-neutral-700 dark:text-neutral-200">Poids : {profile.weight_kg} kg</Text>
          ) : null}
        </Card>

        <Card className="mt-4 p-4">
          <Text className="text-lg font-semibold mb-2">Sports</Text>
          {sports.map((s: UserSport) => (
            <Text key={s.id} className="text-neutral-700 dark:text-neutral-200 mb-1">
              {s.sport_id} — {s.level} — {s.practice} — {s.times_per_week}x/sem
            </Text>
          ))}
        </Card>

        <SecuritySection email={profile.email} />

        <ProfileClubsSection />

        <ProfileEventsSection />

        <View className="flex-row gap-3 mt-6">
          <Button title="Se déconnecter" variant="secondary" className="flex-1" onPress={() => void signOut()} />
          <Button
            title="Supprimer mon compte"
            variant="danger"
            className="flex-1"
            onPress={() => setDeleteOpen(true)}
          />
        </View>
      </ScrollView>

      <EditProfileSheet visible={editOpen} onClose={() => setEditOpen(false)} profile={profile} />
      <DeleteAccountSheet visible={deleteOpen} onClose={() => setDeleteOpen(false)} />
    </SafeAreaView>
  );
}