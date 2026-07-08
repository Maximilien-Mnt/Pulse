import { Button } from "@/components/ui/Button";
import { PUBLIC_SPORT_STATUSES, SPORTS } from "@/lib/constants";
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/queryClient";
import type { PublicStatusMap, UserSport } from "@/types";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Image } from "expo-image";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import Toast from "react-native-toast-message";
import { usePostHog } from "posthog-react-native";

type Props = {
  visible: boolean;
  onClose: () => void;
  userId: string;
  sports: UserSport[];
  onSuccess: () => void;
};

const STEPS = ["intro", "status", "photos", "confirm"] as const;
type Step = (typeof STEPS)[number];

export function PublicProfileActivationModal({ visible, onClose, userId, sports, onSuccess }: Props) {
  const posthog = usePostHog();
  const [step, setStep] = useState<Step>("intro");
  const [statusMap, setStatusMap] = useState<PublicStatusMap>({});
  const [photos, setPhotos] = useState<string[]>([]);

  const sportLabel = (id: string) => SPORTS.find((s) => s.id === id)?.label ?? id;

  const pickPhotos = async () => {
    const p = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!p.granted) {
      Toast.show({ type: "error", text1: "Permission galerie requise" });
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      selectionLimit: 5,
      quality: 0.7,
    });
    if (!res.canceled) {
      const uris = res.assets.map((a) => a.uri).slice(0, 5);
      setPhotos(uris);
    }
  };

  const activateMut = useMutation({
    mutationFn: async () => {
      const urls: string[] = [];
      for (let i = 0; i < photos.length; i++) {
        const uri = photos[i]!;
        const blob = await (await fetch(uri)).blob();
        const path = `${userId}/${Date.now()}_${i}.jpg`;
        const { error } = await supabase.storage
          .from("public-profiles")
          .upload(path, blob, { contentType: "image/jpeg" });
        if (error) throw error;
        const { data: pub } = supabase.storage.from("public-profiles").getPublicUrl(path);
        urls.push(pub.publicUrl);
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          is_public_profile: true,
          public_status: statusMap,
          public_photos: urls,
        })
        .eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      posthog.capture("public_profile_activated", { sports_count: sports.length, photos_count: photos.length });
      Toast.show({ type: "success", text1: "Profil public activé !" });
      setStep("intro");
      setStatusMap({});
      setPhotos([]);
      onSuccess();
      onClose();
      void queryClient.invalidateQueries({ queryKey: ["profile", userId] });
      void queryClient.invalidateQueries({ queryKey: ["public-profile", userId] });
    },
    onError: () => Toast.show({ type: "error", text1: "Activation impossible" }),
  });

  const canNextStatus = sports.every((s) => !!statusMap[s.sport_id]);
  const canNextPhotos = photos.length >= 2 && photos.length <= 5;

  const goNext = () => {
    if (step === "intro") setStep("status");
    else if (step === "status" && canNextStatus) setStep("photos");
    else if (step === "photos" && canNextPhotos) setStep("confirm");
    else if (step === "confirm") activateMut.mutate();
  };

  const goBack = () => {
    if (step === "status") setStep("intro");
    else if (step === "photos") setStep("status");
    else if (step === "confirm") setStep("photos");
    else onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white dark:bg-neutral-900 rounded-t-3xl p-4 max-h-[90%]">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-xl font-bold text-neutral-900 dark:text-neutral-50">Profil public</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={24} color="#64748B" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {step === "intro" && (
              <View>
                <Text className="text-base text-neutral-700 dark:text-neutral-200 mb-4">
                  Active ton profil public pour :
                </Text>
                {[
                  "Publier des posts visibles par la communauté",
                  "Créer des clubs et événements publics",
                  "Être suivi par d'autres sportifs",
                  "Recevoir des messages via ta liste publique",
                ].map((t) => (
                  <View key={t} className="flex-row items-start gap-2 mb-2">
                    <Ionicons name="checkmark-circle" size={20} color="#1E6BFF" />
                    <Text className="flex-1 text-neutral-800 dark:text-neutral-100">{t}</Text>
                  </View>
                ))}
                <Text className="text-sm text-warning mt-4">
                  Attention : une fois activé, le profil public ne peut pas être désactivé.
                </Text>
              </View>
            )}

            {step === "status" && (
              <View>
                <Text className="text-base text-neutral-700 dark:text-neutral-200 mb-4">
                  Choisis ton statut public pour chaque sport pratiqué :
                </Text>
                {sports.map((s) => (
                  <View key={s.id} className="mb-4">
                    <Text className="font-semibold mb-2 text-neutral-900 dark:text-neutral-50">
                      {sportLabel(s.sport_id)}
                    </Text>
                    <View className="flex-row flex-wrap gap-2">
                      {PUBLIC_SPORT_STATUSES.map((st) => (
                        <Pressable
                          key={st}
                          onPress={() => setStatusMap((m) => ({ ...m, [s.sport_id]: st }))}
                          className={`px-3 py-2 rounded-xl border ${
                            statusMap[s.sport_id] === st
                              ? "bg-primary border-primary"
                              : "border-neutral-200 dark:border-neutral-700"
                          }`}
                        >
                          <Text
                            className={
                              statusMap[s.sport_id] === st
                                ? "text-white font-medium"
                                : "text-neutral-800 dark:text-neutral-100"
                            }
                          >
                            {st}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {step === "photos" && (
              <View>
                <Text className="text-base text-neutral-700 dark:text-neutral-200 mb-4">
                  Ajoute entre 2 et 5 photos pour ton profil public.
                </Text>
                <Button title="Choisir des photos" variant="secondary" onPress={pickPhotos} />
                <View className="flex-row flex-wrap gap-2 mt-4">
                  {photos.map((uri, i) => (
                    <Image key={uri} source={{ uri }} style={{ width: 80, height: 80, borderRadius: 12 }} />
                  ))}
                </View>
                <Text className="text-sm text-neutral-500 mt-2">{photos.length}/5 photos</Text>
              </View>
            )}

            {step === "confirm" && (
              <View>
                <Text className="text-base text-neutral-700 dark:text-neutral-200 mb-4">
                  Confirme l'activation de ton profil public.
                </Text>
                <Text className="text-neutral-800 dark:text-neutral-100 mb-2">
                  Sports : {sports.map((s) => `${sportLabel(s.sport_id)} (${statusMap[s.sport_id]})`).join(", ")}
                </Text>
                <Text className="text-neutral-800 dark:text-neutral-100">{photos.length} photos sélectionnées</Text>
              </View>
            )}
          </ScrollView>

          <View className="flex-row gap-2 mt-4">
            <Button title={step === "intro" ? "Annuler" : "Retour"} variant="ghost" onPress={goBack} />
            <Button
              title={step === "confirm" ? "Activer" : "Suivant"}
              onPress={goNext}
              loading={activateMut.isPending}
              disabled={
                (step === "status" && !canNextStatus) ||
                (step === "photos" && !canNextPhotos)
              }
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}
