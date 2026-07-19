import { PublicProfileActivationModal } from "@/components/profile/PublicProfileActivationModal";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { LANGUAGES } from "@/lib/constants";
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/queryClient";
import { useAuthStore } from "@/stores/authStore";
import { useThemeStore } from "@/stores/themeStore";
import { useProfile } from "@/hooks/useProfile";
import dayjs from "dayjs";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { usePostHog } from "posthog-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const ANALYTICS_OPTOUT_KEY = "pulse:analytics-optout";



export default function ProfileScreen() {
  const router = useRouter();
  const posthog = usePostHog();
  const userId = useAuthStore((s) => s.userId);
  const { data: profile, isLoading, isError, error, refetch } = useProfile(userId);
  const isDark = useThemeStore((s) => s.isDark);
  const setDark = useThemeStore((s) => s.setDark);
  const [editOpen, setEditOpen] = useState(false);
  const [publicModalOpen, setPublicModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [city, setCity] = useState("");
  const [analyticsOptOut, setAnalyticsOptOut] = useState(false);

  // Load persisted analytics opt-out preference.
  useEffect(() => {
    void AsyncStorage.getItem(ANALYTICS_OPTOUT_KEY).then((val) => {
      setAnalyticsOptOut(val === "true");
    });
  }, []);

  const toggleAnalyticsOptOut = async (optOut: boolean) => {
    setAnalyticsOptOut(optOut);
    await AsyncStorage.setItem(ANALYTICS_OPTOUT_KEY, optOut ? "true" : "false");
    if (optOut) {
      posthog.optOut();
    } else {
      posthog.optIn();
    }
    Toast.show({
      type: "success",
      text1: optOut ? "Suivi analytique désactivé" : "Suivi analytique activé",
    });
  };



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


  const saveMut = useMutation({
    mutationFn: async () => {
      if (!userId) return;
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: name.trim(), bio: bio.trim() || null, city: city.trim() || null })
        .eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      posthog.capture("profile_updated");
      setEditOpen(false);
      void refetch();
      void queryClient.invalidateQueries({ queryKey: ["profile", userId] });
      Toast.show({ type: "success", text1: "Profil mis à jour" });
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
      <View className="flex-row justify-between items-center px-4 pt-2">
        <Text className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">Mon Profil</Text>
        <Button
          title="Modifier"
          variant="ghost"
          onPress={() => {
            setName(profile.full_name);
            setBio(profile.bio ?? "");
            setCity(profile.city ?? "");
            setEditOpen(true);
          }}
        />
      </View>


      <ScrollView contentContainerClassName="px-4 pb-24 pt-4">
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
        </Card>


        <Card className="mt-4 p-4">
          <Text className="text-lg font-semibold mb-2">Sports</Text>
          {sports.map((s) => (
            <Text key={s.id} className="text-neutral-700 dark:text-neutral-200 mb-1">
              {s.sport_id} — {s.level} — {s.practice} — {s.times_per_week}x/sem
            </Text>
          ))}
        </Card>


        <Card className="mt-4 p-4">
          <Text className="text-lg font-semibold mb-2">Objectifs</Text>
          <View className="flex-row flex-wrap gap-2">
            {objectives.map((o) => (
              <Badge key={o.id}>{o.objective}</Badge>
            ))}
          </View>
        </Card>


        {profile.is_public_profile ? (
          <Button
            title="Voir mon profil public"
            variant="secondary"
            className="mt-6"
            onPress={() => router.push("/profile/public")}
          />
        ) : (
          <Button
            title="Activer le profil public"
            variant="secondary"
            className="mt-6"
            onPress={() => {
              if (sports.length === 0) {
                Toast.show({ type: "info", text1: "Ajoute au moins un sport à ton profil" });
                return;
              }
              setPublicModalOpen(true);
            }}
          />
        )}


        <Card className="mt-6 p-4">
          <Text className="text-lg font-semibold mb-3">Paramètres</Text>
          <View className="flex-row justify-between items-center py-2">
            <Text className="text-neutral-800 dark:text-neutral-100">Mode sombre</Text>
            <Switch value={isDark} onValueChange={(v) => setDark(v)} />
          </View>
          <View className="flex-row justify-between items-center py-2 border-t border-neutral-100 dark:border-neutral-800 mt-1 pt-3">
            <View className="flex-1 pr-3">
              <Text className="text-neutral-800 dark:text-neutral-100">Confidentialité — Suivi analytique</Text>
              <Text className="text-xs text-neutral-500 mt-0.5">
                Désactive la collecte de statistiques d'utilisation anonymes (RGPD).
              </Text>
            </View>
            <Switch value={analyticsOptOut} onValueChange={(v) => void toggleAnalyticsOptOut(v)} />
          </View>
          <Text className="text-sm text-neutral-500 mt-2">Langue : {LANGUAGES.find((l) => l.code === profile.language)?.label}</Text>
        </Card>



        <Button title="Se déconnecter" variant="secondary" className="mt-6" onPress={() => void signOut()} />
        <Button
          title="Supprimer mon compte"
          variant="ghost"
          className="mt-3"
          onPress={() =>
            Alert.alert("Suppression de compte", "Fonctionnalité bientôt disponible — contacte le support.", [
              { text: "OK" },
            ])
          }
        />
      </ScrollView>


      <Modal visible={editOpen} animationType="slide" transparent>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white dark:bg-neutral-900 rounded-t-3xl p-4">
            <Text className="text-xl font-bold mb-3">Modifier le profil</Text>
            <Input label="Nom" value={name} onChangeText={setName} />
            <Input label="Bio" value={bio} onChangeText={setBio} multiline />
            <Input label="Ville" value={city} onChangeText={setCity} />
            <View className="flex-row gap-2 mt-4">
              <Button title="Annuler" variant="ghost" onPress={() => setEditOpen(false)} />
              <Button title="Enregistrer" onPress={() => saveMut.mutate()} loading={saveMut.isPending} />
            </View>
          </View>
        </View>
      </Modal>


      {userId ? (
        <PublicProfileActivationModal
          visible={publicModalOpen}
          onClose={() => setPublicModalOpen(false)}
          userId={userId}
          sports={sports}
          onSuccess={() => void refetch()}
        />
      ) : null}
    </SafeAreaView>
  );
}