import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LANGUAGES, OBJECTIVES, SPORTS } from "@/lib/constants";
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/queryClient";
import type { Profile, ProfileUpdate } from "@/types";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { useMutation } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import Toast from "react-native-toast-message";
import { usePostHog } from "posthog-react-native";

type Props = {
  visible: boolean;
  onClose: () => void;
  profile: Profile | null;
};

function base64ToArrayBuffer(base64: string) {
  const binary = globalThis.atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function uploadAvatar(uri: string, userId: string): Promise<string> {
  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: "base64" });
  const arrayBuffer = base64ToArrayBuffer(base64);
  const { error } = await supabase.storage.from("avatars").upload(`${userId}/avatar.jpg`, arrayBuffer, {
    contentType: "image/jpeg",
    upsert: true,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("avatars").getPublicUrl(`${userId}/avatar.jpg`);
  return data.publicUrl;
}

/**
 * Full edit form with V1 fields: name, bio, city, height, weight, language, photo, objectives, sports.
 */
export function EditProfileSheet({ visible, onClose, profile }: Props) {
  const posthog = usePostHog();
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [city, setCity] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [language, setLanguage] = useState("fr");
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [selectedObjectives, setSelectedObjectives] = useState<string[]>([]);

  const { data: currentObjectives = [] } = useQuery({
    queryKey: ["my-objectives", profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data } = await supabase.from("user_objectives").select("objective").eq("user_id", profile!.id);
      return (data ?? []).map((o) => o.objective);
    },
  });

  useEffect(() => {
    if (!profile) return;
    setName(profile.full_name);
    setBio(profile.bio ?? "");
    setCity(profile.city ?? "");
    setHeight(profile.height_cm ? String(profile.height_cm) : "");
    setWeight(profile.weight_kg ? String(profile.weight_kg) : "");
    setLanguage(profile.language);
    setAvatarUri(null);
  }, [profile]);

  useEffect(() => {
    setSelectedObjectives(currentObjectives);
  }, [currentObjectives]);

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!profile) return;

      let avatar_url = profile.avatar_url;
      if (avatarUri) {
        avatar_url = await uploadAvatar(avatarUri, profile.id);
      }

      const patch: ProfileUpdate = {
        full_name: name.trim(),
        bio: bio.trim() || null,
        city: city.trim() || null,
        height_cm: height ? parseInt(height, 10) : null,
        weight_kg: weight ? parseFloat(weight) : null,
        language: language as ProfileUpdate["language"],
        avatar_url,
      };

      const { error } = await supabase.from("profiles").update(patch).eq("id", profile.id);
      if (error) throw error;

      // Sync objectives
      const existing = new Set(currentObjectives);
      const newOnes = selectedObjectives.filter((o) => !existing.has(o));
      const toRemove = currentObjectives.filter((o) => !selectedObjectives.includes(o));

      for (const o of newOnes) {
        await supabase.from("user_objectives").insert({ user_id: profile.id, objective: o });
      }
      if (toRemove.length) {
        await supabase.from("user_objectives").delete().eq("user_id", profile.id).in("objective", toRemove);
      }
    },
    onSuccess: () => {
      posthog.capture("profile_updated_v2");
      void queryClient.invalidateQueries({ queryKey: ["profile", profile?.id] });
      void queryClient.invalidateQueries({ queryKey: ["my-objectives", profile?.id] });
      Toast.show({ type: "success", text1: "Profil mis à jour" });
      onClose();
    },
    onError: () => Toast.show({ type: "error", text1: "Erreur de sauvegarde" }),
  });

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.7, allowsEditing: true, aspect: [1, 1] });
    if (!res.canceled && res.assets[0]) setAvatarUri(res.assets[0].uri);
  };

  const toggleObjective = (obj: string) => {
    setSelectedObjectives((prev) =>
      prev.includes(obj) ? prev.filter((o) => o !== obj) : [...prev, obj]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white dark:bg-neutral-900 rounded-t-3xl p-4 max-h-[90%]">
          <Text className="text-xl font-bold mb-3 text-neutral-900 dark:text-neutral-50">Modifier le profil</Text>
          <ScrollView contentContainerClassName="pb-4">
            <Pressable onPress={pickImage} className="items-center mb-4">
              <Avatar uri={avatarUri ?? profile?.avatar_url ?? null} size={80} className="border-2 border-primary" />
              <Text className="text-primary text-sm font-medium mt-1">Changer la photo</Text>
            </Pressable>

            <Input label="Nom" value={name} onChangeText={setName} />
            <Input label="Bio" value={bio} onChangeText={setBio} multiline />
            <Input label="Ville" value={city} onChangeText={setCity} />
            <Input label="Taille (cm)" value={height} onChangeText={setHeight} keyboardType="numeric" />
            <Input label="Poids (kg)" value={weight} onChangeText={setWeight} keyboardType="numeric" />

            <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-200 mt-3 mb-1">Langue</Text>
            <View className="flex-row flex-wrap gap-2 mb-3">
              {LANGUAGES.map((l) => (
                <Pressable
                  key={l.code}
                  onPress={() => setLanguage(l.code)}
                  className={`px-3 py-2 rounded-xl border ${
                    language === l.code
                      ? "bg-primary border-primary"
                      : "bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700"
                  }`}
                >
                  <Text
                    className={language === l.code ? "text-white font-medium" : "text-neutral-800 dark:text-neutral-100"}
                  >
                    {l.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-200 mt-2 mb-1">Objectifs</Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
              {OBJECTIVES.map((obj) => (
                <Pressable
                  key={obj}
                  onPress={() => toggleObjective(obj)}
                  className={`px-3 py-2 rounded-xl border ${
                    selectedObjectives.includes(obj)
                      ? "bg-primary border-primary"
                      : "bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700"
                  }`}
                >
                  <Text
                    className={
                      selectedObjectives.includes(obj) ? "text-white font-medium" : "text-neutral-800 dark:text-neutral-100"
                    }
                  >
                    {obj}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View className="flex-row gap-2 mt-2">
              <Button title="Annuler" variant="ghost" onPress={onClose} />
              <Button title="Enregistrer" onPress={() => saveMut.mutate()} loading={saveMut.isPending} />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}