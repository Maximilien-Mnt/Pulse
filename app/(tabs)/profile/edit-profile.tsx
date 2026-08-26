import { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useMutation } from "@tanstack/react-query";
import dayjs from "dayjs";
import Toast from "react-native-toast-message";
import { usePostHog } from "posthog-react-native";

import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { BackButton } from "@/components/ui/BackButton";
import { NativePicker } from "@/components/ui/NativePicker";
import { SafeScreen } from "@/components/shared/SafeScreen";
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/queryClient";
import { uploadImageToStorage } from "@/lib/imageUpload";
import { OBJECTIVES, SPORTS, COUNTRIES } from "@/lib/constants";
import { useKeyboardHeight } from "@/lib/keyboardUtils";
import { getCountryDisplay } from "@/utils/countries";
import { useAuthStore } from "@/stores/authStore";
import { useProfile } from "@/hooks/useProfile";

async function uploadAvatar(uri: string, userId: string): Promise<string> {
  return uploadImageToStorage({
    bucket: "avatars",
    path: `${userId}/avatar.jpg`,
    uri,
    upsert: true,
    cacheBust: true,
  });
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <View className="gap-2">
      <Text className="text-xs text-neutral-500 dark:text-neutral-400">{label}</Text>
      <View className="h-12 justify-center rounded-sm border-[1.5px] border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 px-4">
        <Text className="text-base text-neutral-900 dark:text-neutral-50">{value}</Text>
      </View>
    </View>
  );
}

function SportPill({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {SPORTS.map((s) => {
        const active = selected.includes(s.id);
        return (
          <Pressable
            key={s.id}
            onPress={() => onToggle(s.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            className={`px-4 py-2 rounded-full ${
              active ? "bg-primary" : "bg-neutral-200 dark:bg-neutral-800"
            }`}
          >
            <Text
              className={`${
                active
                  ? "text-white font-medium"
                  : "text-neutral-700 dark:text-neutral-200"
              }`}
            >
              {s.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function EditProfileScreen() {
  const router = useRouter();
  const posthog = usePostHog();
  const userId = useAuthStore((s) => s.userId);
  const { data: profile } = useProfile(userId);
  const keyboardHeight = useKeyboardHeight();

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState<string | null>(null);
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [practicedSports, setPracticedSports] = useState<string[]>([]);
  const [interestedSports, setInterestedSports] = useState<string[]>([]);
  const [selectedObjectives, setSelectedObjectives] = useState<string[]>([]);
  const [countryOpen, setCountryOpen] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setName(profile.full_name ?? "");
    setBio(profile.bio ?? "");
    setCity(profile.city ?? "");
    setCountry(profile.country ?? null);
    setHeight(profile.height_cm ? String(profile.height_cm) : "");
    setWeight(profile.weight_kg ? String(profile.weight_kg) : "");
    setAvatarUri(null);
    setInterestedSports((profile.interested_sports as string[]) ?? []);
  }, [profile]);

  useEffect(() => {
    if (!profile?.id) return;
    void (supabase as any)
      .from("user_sports")
      .select("sport_id, category")
      .eq("user_id", profile.id)
      .then(({ data, error }: { data: any; error: any }) => {
        if (error || !data) return;
        const rows = data as { sport_id: string; category: string }[];
        setPracticedSports(
          rows.filter((s) => s.category === "practiced").map((s) => s.sport_id)
        );
        const interested = rows
          .filter((s) => s.category === "interested")
          .map((s) => s.sport_id);
        if (interested.length) setInterestedSports(interested);
      });
  }, [profile?.id]);

  useEffect(() => {
    if (!profile?.id) return;
    void supabase
      .from("user_objectives")
      .select("objective")
      .eq("user_id", profile.id)
      .then(({ data, error }: { data: any; error: any }) => {
        if (error || !data) return;
        const rows = data as { objective: string }[];
        setSelectedObjectives(rows.map((o) => o.objective));
      });
  }, [profile?.id]);

  const togglePracticed = (id: string) =>
    setPracticedSports((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );

  const toggleInterested = (id: string) =>
    setInterestedSports((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );

  const toggleObjective = (obj: string) =>
    setSelectedObjectives((prev) =>
      prev.includes(obj) ? prev.filter((o) => o !== obj) : [...prev, obj]
    );

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!res.canceled && res.assets[0]) setAvatarUri(res.assets[0].uri);
  };

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!profile || !profile.id) return;
      if (!name.trim()) throw new Error("Le nom est requis");
      let avatarUrl = profile.avatar_url;
      if (avatarUri) {
        avatarUrl = await uploadAvatar(avatarUri, profile.id);
      }

      const patch: any = {
        full_name: name.trim(),
        bio: bio.trim() || null,
        city: city.trim() || null,
        country: (country ?? "").trim() || null,
        height_cm: height ? parseInt(height, 10) : null,
        weight_kg: weight ? parseFloat(weight) : null,
        avatar_url: avatarUrl,
        interested_sports: [...new Set(interestedSports)],
        language: "fr" as const,
      };

      const { error: profileErr } = await supabase
        .from("profiles")
        .update(patch)
        .eq("id", profile.id);
      if (profileErr) throw profileErr;

      await syncSports(profile.id);
      await syncObjectives(profile.id);
    },
    onSuccess: () => {
      posthog.capture("profile_updated_v3");
      void queryClient.invalidateQueries({ queryKey: ["profile", profile?.id] });
      void queryClient.invalidateQueries({ queryKey: ["public-profile", profile?.id] });
      void queryClient.invalidateQueries({ queryKey: ["user-sports"] });
      void queryClient.invalidateQueries({ queryKey: ["my-objectives"] });
      Toast.show({ type: "success", text1: "Profil mis à jour" });
      router.back();
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "Erreur de sauvegarde";
      Toast.show({ type: "error", text1: message });
    },
  });
  async function syncSports(userId: string) {
    const targetSet = new Set([
      ...practicedSports.map((s) => `${s}-practiced`),
      ...interestedSports.map((s) => `${s}-interested`),
    ]);

    const { data: existing, error: loadErr } = await (supabase as any)
      .from("user_sports")
      .select("sport_id, category")
      .eq("user_id", userId);
    if (loadErr) throw loadErr;
    const current = (existing ?? []) as { sport_id: string; category: string }[];
    const currentSet = new Set(current.map((s) => `${s.sport_id}-${s.category}`));

    for (const s of current) {
      const key = `${s.sport_id}-${s.category}`;
      if (!targetSet.has(key)) {
        const { error } = await (supabase as any)
          .from("user_sports")
          .delete()
          .eq("user_id", userId)
          .eq("sport_id", s.sport_id)
          .eq("category", s.category);
        if (error) throw error;
      }
    }

    const toInsert: { user_id: string; sport_id: string; category: "practiced" | "interested"; level: string; practice: string }[] = [];
    for (const sport of practicedSports) {
      if (!currentSet.has(`${sport}-practiced`)) {
        toInsert.push({ user_id: userId, sport_id: sport, category: "practiced", level: "", practice: "" });
      }
    }
    for (const sport of interestedSports) {
      if (!currentSet.has(`${sport}-interested`)) {
        toInsert.push({ user_id: userId, sport_id: sport, category: "interested", level: "", practice: "" });
      }
    }
    if (toInsert.length) {
      const { error } = await (supabase as any).from("user_sports").insert(toInsert);
      if (error) throw error;
    }
  }

  async function syncObjectives(userId: string) {
    const { data: existing, error: loadErr } = await supabase
      .from("user_objectives")
      .select("objective")
      .eq("user_id", userId);
    if (loadErr) throw loadErr;
    const current = (existing ?? []).map((o) => o.objective);
    const toRemove = current.filter((o) => !selectedObjectives.includes(o));
    const toAdd = selectedObjectives.filter((o) => !current.includes(o));
    if (toRemove.length) {
      const { error } = await supabase
        .from("user_objectives")
        .delete()
        .eq("user_id", userId)
        .in("objective", toRemove);
      if (error) throw error;
    }
    if (toAdd.length) {
      const { error } = await supabase.from("user_objectives").insert(
        toAdd.map((o) => ({ user_id: userId, objective: o }))
      );
      if (error) throw error;
    }
  }
  return (
    <SafeScreen className="flex-1 bg-neutral-50 dark:bg-[#0A0F1E]" edges={["top"]}>
      <View className="flex-row items-center px-4 py-3 border-b border-neutral-100 dark:border-neutral-800">
        <BackButton />
        <Text className="flex-1 text-lg font-bold text-center text-neutral-900 dark:text-neutral-50">
          Modifier le profil
        </Text>
        <View className="w-11" />
      </View>

      <ScrollView
        contentContainerClassName="p-4"
        contentContainerStyle={{
          paddingBottom: keyboardHeight > 0 ? keyboardHeight + 24 : 24,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Card className="mb-4">
          <Text className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 mb-3">
            Photo de profil
          </Text>
          <Pressable
            onPress={pickImage}
            className="items-center py-2 active:opacity-80"
            accessibilityRole="button"
            accessibilityLabel="Changer la photo de profil"
          >
            <Avatar
              uri={avatarUri ?? profile?.avatar_url ?? null}
              size={96}
              className="border-2 border-primary"
            />
            <Text className="text-primary text-sm font-medium mt-2">
              Changer la photo
            </Text>
          </Pressable>
        </Card>

        <Card className="p-4 mb-4">
          <Text className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 mb-3">
            Informations
          </Text>
          <View className="gap-4">
            <Input
              label="Nom"
              value={name}
              onChangeText={setName}
              placeholder="Ton nom"
              returnKeyType="next"
            />
            <ReadOnlyField
              label="Pseudo"
              value={profile?.username ? `@${profile.username}` : ""}
            />
            <ReadOnlyField
              label="Date de naissance"
              value={
                profile?.birth_date
                  ? dayjs(profile.birth_date).format("DD/MM/YYYY")
                  : "Non renseignée"
              }
            />
            <Text className="text-xs text-neutral-400 dark:text-neutral-500 -mt-2">
              Le pseudo et la date de naissance ne sont pas modifiables.
            </Text>

            <View className="gap-2">
              <Text className="text-xs text-neutral-500 dark:text-neutral-400">
                Pays
              </Text>
              <Pressable
                onPress={() => setCountryOpen(true)}
                accessibilityRole="button"
                className="h-12 justify-center rounded-sm border-[1.5px] border-border bg-surface dark:bg-surface-dark px-4"
              >
                <Text className="text-base text-neutral-900 dark:text-neutral-50">
                  {country ? getCountryDisplay(country) : "Sélectionner un pays"}
                </Text>
              </Pressable>
            </View>

            <Input
              label="Ville"
              value={city}
              onChangeText={setCity}
              placeholder="Ex. Paris"
              returnKeyType="next"
            />
            <Input
              label="Bio"
              value={bio}
              onChangeText={setBio}
              multiline
              placeholder="Présente-toi brièvement..."
              returnKeyType="done"
            />
          </View>
        </Card>
        <Card className="p-4 mb-4">
          <Text className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 mb-3">
            Morphologie
          </Text>
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Input
                label="Taille (cm)"
                value={height}
                onChangeText={setHeight}
                keyboardType="numeric"
                returnKeyType="next"
                placeholder="180"
              />
            </View>
            <View className="flex-1">
              <Input
                label="Poids (kg)"
                value={weight}
                onChangeText={setWeight}
                keyboardType="numeric"
                returnKeyType="done"
                placeholder="75"
              />
            </View>
          </View>
        </Card>

        <Card className="p-4 mb-4">
          <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Objectifs</Text>
          <View className="flex-row flex-wrap gap-2">
            {OBJECTIVES.map((obj) => {
              const active = selectedObjectives.includes(obj);
              return (
                <Pressable
                  key={obj}
                  onPress={() => toggleObjective(obj)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  className={`px-3 py-2 rounded-xl border ${
                    active
                      ? "bg-primary border-primary"
                      : "bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700"
                  }`}
                >
                  <Text
                    className={
                      active
                        ? "text-white font-medium"
                        : "text-neutral-800 dark:text-neutral-100"
                    }
                  >
                    {obj}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Card>

        <Card className="p-4 mb-4">
          <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Sports pratiqués
          </Text>
          <SportPill selected={practicedSports} onToggle={togglePracticed} />
        </Card>

        <Card className="p-4 mb-4">
          <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Sports qui m'intéressent
          </Text>
          <SportPill selected={interestedSports} onToggle={toggleInterested} />
        </Card>

        <Button
          title="Enregistrer"
          onPress={() => saveMut.mutate()}
          loading={saveMut.isPending}
          className="w-full"
        />
        <View className="h-4" />
      </ScrollView>

      <CountryPickerModal
        visible={countryOpen}
        selectedValue={country ?? "FR"}
        onSelect={(v) => setCountry(v)}
        onClose={() => setCountryOpen(false)}
      />
    </SafeScreen>
  );
}
function CountryPickerModal({
  visible,
  selectedValue,
  onSelect,
  onClose,
}: {
  visible: boolean;
  selectedValue: string;
  onSelect: (v: string) => void;
  onClose: () => void;
}) {
  return (
    <NativePicker
      visible={visible}
      title="Pays"
      confirmLabel="OK"
      options={COUNTRIES.map((c) => ({
        value: c.code,
        label: (getCountryDisplay(c.code) ?? "") as string,
      }))}
      selectedValue={selectedValue}
      onSelect={(v) => {
        onSelect(String(v));
        onClose();
      }}
      onClose={onClose}
    />
  );
}
