import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/queryClient";
import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { useMutation } from "@tanstack/react-query";
import Toast from "react-native-toast-message";
import { Ionicons } from "@expo/vector-icons";
import type { PublicStatusMap, PublicSportStatus, Profile } from "@/types";

type Props = {
  visible: boolean;
  userId: string;
  sports: { id: string; sport_id: string; level: string; practice: string }[];
  onClose: () => void;
  onSuccess?: () => void;
};

type ProfilePublicData = Pick<Profile, "bio" | "public_status" | "public_photos" | "is_public_profile">;

function base64ToArrayBuffer(base64: string) {
  const binary = globalThis.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function uploadPublicProfileImage(uri: string, path: string) {
  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: "base64" });
  const arrayBuffer = base64ToArrayBuffer(base64);
  const { error } = await supabase.storage.from("public-profiles").upload(path, arrayBuffer, {
    contentType: "image/jpeg",
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("public-profiles").getPublicUrl(path);
  return data.publicUrl;
}

const PUBLIC_STATUS_OPTIONS: PublicSportStatus[] = [
  "Coach",
  "Amateur",
  "Récréatif",
  "Semi-Professionnel",
  "Professionnel",
];

export default function EditPublicProfile({ visible, userId, sports, onClose, onSuccess }: Props) {
  const [bio, setBio] = useState("");
  const [statusBySport, setStatusBySport] = useState<PublicStatusMap>({});
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [step, setStep] = useState(1);

  useEffect(() => {
    if (!visible) return;

    const load = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("bio, public_status, public_photos, is_public_profile")
        .eq("id", userId)
        .single();

      if (error) {
        Toast.show({ type: "error", text1: "Impossible de charger le profil public" });
        return;
      }

      const row = data as ProfilePublicData;
      setBio(row.bio ?? "");
      setStatusBySport((row.public_status ?? {}) as PublicStatusMap);
      setSelectedPhotos(row.public_photos ?? []);
      setStep(1);
    };

    void load();
  }, [visible, userId]);

  const canContinue = useMemo(() => {
    if (step === 1) return true;
    if (step === 2) return sports.every((s) => !!statusBySport[s.sport_id]);
    if (step === 3) return selectedPhotos.length >= 1;
    return true;
  }, [step, statusBySport, selectedPhotos.length, sports]);

  const pickPhotos = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: 5,
      base64: false,
    });

    if (res.canceled) return;

    const uris = res.assets.map((a) => a.uri).slice(0, 5);
    setSelectedPhotos((prev) => Array.from(new Set([...prev, ...uris])).slice(0, 5));
  };

  const saveMut = useMutation({
    mutationFn: async () => {
      const uploaded: string[] = [];

      for (let i = 0; i < selectedPhotos.length; i += 1) {
        const uri = selectedPhotos[i]!;
        if (uri.startsWith("http")) {
          uploaded.push(uri);
          continue;
        }

        const path = `${userId}/${Date.now()}_${i}.jpg`;
        const url = await uploadPublicProfileImage(uri, path);
        uploaded.push(url);
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          is_public_profile: true,
          public_status: statusBySport,
          public_photos: uploaded,
          bio: bio.trim() || null,
        })
        .eq("id", userId);

      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["profile", userId] });
      Toast.show({ type: "success", text1: "Profil public activé" });
      onSuccess?.();
      onClose();
    },
    onError: () => {
      Toast.show({ type: "error", text1: "Impossible d’activer le profil public" });
    },
  });

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white dark:bg-neutral-900 rounded-t-3xl p-4 max-h-[90%]">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-xl font-bold text-neutral-900 dark:text-neutral-50">Profil public</Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={24} color="#64748B" />
            </Pressable>
          </View>

          <View className="flex-row gap-2 mb-4">
            {[1, 2, 3].map((n) => (
              <View
                key={n}
                className={`h-2 flex-1 rounded-full ${step >= n ? "bg-primary" : "bg-neutral-200 dark:bg-neutral-800"}`}
              />
            ))}
          </View>

          {step === 1 ? (
            <ScrollView>
              <Text className="text-base text-neutral-700 dark:text-neutral-200 mb-3">
                Le profil public permet de te mettre en avant dans Pulse.
              </Text>
              <Card className="p-4">
                <Text className="font-semibold mb-2 text-neutral-900 dark:text-neutral-50">
                  Statut par sport
                </Text>
                {sports.map((sport) => (
                  <View key={sport.id} className="mb-3">
                    <Text className="text-neutral-700 dark:text-neutral-200 mb-2">{sport.sport_id}</Text>
                    <View className="flex-row flex-wrap gap-2">
                      {PUBLIC_STATUS_OPTIONS.map((status) => (
                        <Pressable
                          key={status}
                          onPress={() =>
                            setStatusBySport((prev) => ({
                              ...prev,
                              [sport.sport_id]: status,
                            }))
                          }
                          className={`px-3 py-2 rounded-full border ${
                            statusBySport[sport.sport_id] === status
                              ? "bg-primary border-primary"
                              : "bg-transparent border-neutral-300 dark:border-neutral-700"
                          }`}
                        >
                          <Text
                            className={
                              statusBySport[sport.sport_id] === status
                                ? "text-white font-medium"
                                : "text-neutral-700 dark:text-neutral-200"
                            }
                          >
                            {status}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ))}
              </Card>
            </ScrollView>
          ) : null}

          {step === 2 ? (
            <ScrollView>
              <Text className="text-base text-neutral-700 dark:text-neutral-200 mb-3">
                Ajoute jusqu’à 5 photos pour ton profil public.
              </Text>
              <Button title="Ajouter des photos" variant="secondary" onPress={() => void pickPhotos()} />
              <View className="flex-row flex-wrap gap-2 mt-4">
                {selectedPhotos.map((uri, index) => (
                  <View
                    key={`${uri}-${index}`}
                    className="w-[30%] aspect-square rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-800"
                  >
                    <Image
                      source={{ uri }}
                      style={{ width: "100%", height: "100%" }}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                    />
                  </View>
                ))}
              </View>
            </ScrollView>
          ) : null}

          {step === 3 ? (
            <ScrollView>
              <Text className="text-base text-neutral-700 dark:text-neutral-200 mb-3">
                Vérifie les informations avant d’activer ton profil public.
              </Text>
              <Card className="p-4">
                <Text className="font-semibold mb-2">Aperçu</Text>
                <Text className="text-neutral-700 dark:text-neutral-200">Bio : {bio || "—"}</Text>
                <Text className="text-neutral-700 dark:text-neutral-200 mt-2">
                  Photos : {selectedPhotos.length}
                </Text>
              </Card>
            </ScrollView>
          ) : null}

          <View className="mt-4">
            <Input label="Bio" value={bio} onChangeText={setBio} multiline />
          </View>

          <View className="flex-row gap-2 mt-4">
            <Button
              title="Précédent"
              variant="ghost"
              onPress={() => setStep((s) => Math.max(1, s - 1))}
              disabled={step === 1}
            />
            {step < 3 ? (
              <Button
                title="Continuer"
                onPress={() => {
                  if (!canContinue) {
                    Toast.show({ type: "info", text1: "Complète les informations demandées" });
                    return;
                  }
                  setStep((s) => s + 1);
                }}
              />
            ) : (
              <Button title="Activer" onPress={() => saveMut.mutate()} loading={saveMut.isPending} />
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}