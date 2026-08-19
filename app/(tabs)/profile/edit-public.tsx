import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { SPORTS } from "@/lib/constants";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { useProfile } from "@/hooks/useProfile";
import { queryClient } from "@/lib/queryClient";
import { parseTagsInput } from "@/utils/format";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Keyboard, Modal, Pressable, ScrollView, Text, TouchableWithoutFeedback, View } from "react-native";
import { SafeScreen } from "@/components/shared/SafeScreen";
import Toast from "react-native-toast-message";
import { usePostHog } from "posthog-react-native";
import { useKeyboardHeight } from "@/lib/keyboardUtils";
import { BackButton } from "@/components/ui/BackButton";

export default function EditPublicProfileScreen() {
  const router = useRouter();
  const posthog = usePostHog();
  const userId = useAuthStore((s) => s.userId);
  const { data: profile } = useProfile(userId);
  const [bio, setBio] = useState("");
  const [practicedSports, setPracticedSports] = useState<string[]>([]);
  const [interestedSports, setInterestedSports] = useState<string[]>([]);
  const keyboardHeight = useKeyboardHeight();

  useEffect(() => {
    if (!profile) return;
    setBio(profile.bio ?? "");
    
    // Load existing sports grouped by category
    void supabase
      .from("user_sports")
      .select("sport_id, category")
      .eq("user_id", profile.id)
      .then(({ data }) => {
        if (!data) return;
        const practiced = (data as any[]).filter((s) => s.category === "practiced").map((s) => s.sport_id);
        const interested = (data as any[]).filter((s) => s.category === "interested").map((s) => s.sport_id);
        setPracticedSports(practiced);
        setInterestedSports(interested);
      });
  }, [profile]);

  const toggleSport = (sport: string, category: "practiced" | "interested") => {
    if (category === "practiced") {
      setPracticedSports((prev) =>
        prev.includes(sport) ? prev.filter((s) => s !== sport) : [...prev, sport]
      );
    } else {
      setInterestedSports((prev) =>
        prev.includes(sport) ? prev.filter((s) => s !== sport) : [...prev, sport]
      );
    }
  };

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!profile || !profile.id) return;

      const patch = {
        bio: bio.trim() || null,
        language: "fr" as const,
      };

      const { error: profileErr } = await supabase.from("profiles").update(patch).eq("id", profile.id);
      if (profileErr) throw profileErr;

      // Sync sports with categories
      const existing = await (supabase.from("user_sports").select("sport_id, category").eq("user_id", profile.id) as any);
      const currentSports = existing.data ?? [];
      
      // Build sets for comparison
      const currentSet = new Set(currentSports.map((s: any) => `${s.sport_id}-${s.category}`));
      const toUpsert: any[] = [];

      // Add practiced sports
      for (const sport of practicedSports) {
        if (!currentSet.has(`${sport}-practiced`)) {
          toUpsert.push({ user_id: profile.id, sport_id: sport, category: "practiced", level: "", practice: "" });
        }
      }

      // Add interested sports
      for (const sport of interestedSports) {
        if (!currentSet.has(`${sport}-interested`)) {
          toUpsert.push({ user_id: profile.id, sport_id: sport, category: "interested", level: "", practice: "" });
        }
      }

      // Remove sports that are no longer in either category
      const targetSet = new Set([
        ...practicedSports.map((s) => `${s}-practiced`),
        ...interestedSports.map((s) => `${s}-interested`),
      ]);

      for (const s of currentSports) {
        const key = `${(s as any).sport_id}-${(s as any).category}`;
        if (!targetSet.has(key)) {
          // `category` was added by migration 022 but isn't in the generated types yet.
          await (supabase.from("user_sports").delete() as any)
            .eq("user_id", profile.id)
            .eq("sport_id", (s as any).sport_id)
            .eq("category", (s as any).category);
        }
      }

      // Insert new records
      for (const record of toUpsert) {
        await supabase.from("user_sports").insert(record);
      }
    },
    onSuccess: () => {
      posthog.capture("public_profile_updated");
      void queryClient.invalidateQueries({ queryKey: ["user-sports", profile?.id] });
      void queryClient.invalidateQueries({ queryKey: ["profile", profile?.id] });
      Toast.show({ type: "success", text1: "Profil public mis à jour" });
      router.back();
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "Erreur de sauvegarde";
      Toast.show({ type: "error", text1: message });
    },
  });

  return (
    <SafeScreen className="flex-1 bg-neutral-50 dark:bg-[#0A0F1E]" edges={["top"]}>
      <View className="flex-row items-center px-4 py-3 border-b border-neutral-100 dark:border-neutral-800">
        <BackButton />
        <Text className="flex-1 text-lg font-bold text-center text-neutral-900 dark:text-neutral-50">
          Profil public
        </Text>
        <View className="w-11" />
      </View>

      <ScrollView 
        contentContainerStyle={{ paddingBottom: keyboardHeight > 0 ? keyboardHeight + 20 : 20 }}
        keyboardShouldPersistTaps="handled"
      >
        <Card className="p-4 mb-4">
          <Text className="text-sm text-neutral-500 mb-4">
            Ce profil sera visible par tous les utilisateurs pour t'inviter à des clubs et événements.
          </Text>

          <Input
            label="Bio"
            value={bio}
            onChangeText={setBio}
            multiline
            placeholder="Présente-toi brièvement..."
          />
        </Card>

        <Card className="p-4 mb-4">
          <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Sports pratiqués</Text>
          <View className="flex-row flex-wrap gap-2">
            {SPORTS.map((s) => (
              <Pressable
                key={s.id}
                onPress={() => toggleSport(s.id, "practiced")}
                className={`px-4 py-2 rounded-full ${
                  practicedSports.includes(s.id) ? "bg-primary" : "bg-neutral-200 dark:bg-neutral-800"
                }`}
              >
                <Text className={practicedSports.includes(s.id) ? "text-white font-medium" : "text-neutral-700 dark:text-neutral-200"}>
                  {s.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </Card>

        <Card className="p-4 mb-4">
          <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Sports qui m'intéressent</Text>
          <View className="flex-row flex-wrap gap-2">
            {SPORTS.map((s) => (
              <Pressable
                key={s.id}
                onPress={() => toggleSport(s.id, "interested")}
                className={`px-4 py-2 rounded-full ${
                  interestedSports.includes(s.id) ? "bg-primary" : "bg-neutral-200 dark:bg-neutral-800"
                }`}
              >
                <Text className={interestedSports.includes(s.id) ? "text-white font-medium" : "text-neutral-700 dark:text-neutral-200"}>
                  {s.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </Card>

        <Button
          title="Enregistrer"
          onPress={() => saveMut.mutate()}
          loading={saveMut.isPending}
        />
      </ScrollView>
    </SafeScreen>
  );
}