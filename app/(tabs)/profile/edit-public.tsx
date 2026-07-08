import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PUBLIC_SPORT_STATUSES, SPORTS } from "@/lib/constants";
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/queryClient";
import { useProfile } from "@/hooks/useProfile";
import { parsePublicStatus } from "@/hooks/usePublicProfile";
import { useAuthStore } from "@/stores/authStore";
import type { PublicStatusMap } from "@/types";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Image } from "expo-image";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

export default function EditPublicProfileScreen() {
  const router = useRouter();
  const userId = useAuthStore((s) => s.userId);
  const { data: profile, refetch } = useProfile(userId);
  const [bio, setBio] = useState("");
  const [statusMap, setStatusMap] = useState<PublicStatusMap>({});
  const [photos, setPhotos] = useState<string[]>([]);

  const { data: sports = [] } = useQuery({
    queryKey: ["my-sports", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("user_sports").select("*").eq("user_id", userId!);
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    if (profile) {
      setBio(profile.bio ?? "");
      setStatusMap(parsePublicStatus(profile.public_status));
      setPhotos(profile.public_photos ?? []);
    }
  }, [profile]);

  const pickPhotos = async () => {
    const p = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!p.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      selectionLimit: 5,
      quality: 0.7,
    });
    if (!res.canceled) setPhotos(res.assets.map((a) => a.uri).slice(0, 5));
  };

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!userId) return;
      const urls: string[] = [];
      for (let i = 0; i < photos.length; i++) {
        const uri = photos[i]!;
        if (uri.startsWith("http")) {
          urls.push(uri);
          continue;
        }
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
        .update({ bio: bio.trim() || null, public_status: statusMap, public_photos: urls })
        .eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      Toast.show({ type: "success", text1: "Profil public mis à jour" });
      void refetch();
      void queryClient.invalidateQueries({ queryKey: ["public-profile", userId] });
      router.back();
    },
    onError: () => Toast.show({ type: "error", text1: "Échec de la mise à jour" }),
  });

  const sportLabel = (id: string) => SPORTS.find((s) => s.id === id)?.label ?? id;

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-[#0A0F1E]" edges={["top"]}>
      <View className="flex-row items-center px-4 pt-2">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color="#1E6BFF" />
        </Pressable>
        <Text className="text-lg font-bold ml-3 text-neutral-900 dark:text-neutral-50">Modifier profil public</Text>
      </View>

      <ScrollView contentContainerClassName="px-4 pb-24 pt-4">
        <Input label="Bio publique" value={bio} onChangeText={setBio} multiline />

        <Text className="text-lg font-semibold mb-3 text-neutral-900 dark:text-neutral-50">Statuts par sport</Text>
        {sports.map((s) => (
          <View key={s.id} className="mb-4">
            <Text className="font-medium mb-2 text-neutral-800 dark:text-neutral-100">{sportLabel(s.sport_id)}</Text>
            <View className="flex-row flex-wrap gap-2">
              {PUBLIC_SPORT_STATUSES.map((st) => (
                <Pressable
                  key={st}
                  onPress={() => setStatusMap((m) => ({ ...m, [s.sport_id]: st }))}
                  className={`px-3 py-2 rounded-xl border ${
                    statusMap[s.sport_id] === st ? "bg-primary border-primary" : "border-neutral-200 dark:border-neutral-700"
                  }`}
                >
                  <Text className={statusMap[s.sport_id] === st ? "text-white" : "text-neutral-800 dark:text-neutral-100"}>
                    {st}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        <Text className="text-lg font-semibold mb-2 text-neutral-900 dark:text-neutral-50">Photos publiques</Text>
        <Button title="Modifier les photos" variant="secondary" onPress={pickPhotos} />
        <View className="flex-row flex-wrap gap-2 mt-3">
          {photos.map((uri) => (
            <Image key={uri} source={{ uri }} style={{ width: 80, height: 80, borderRadius: 12 }} />
          ))}
        </View>

        <Button title="Enregistrer" className="mt-6" onPress={() => saveMut.mutate()} loading={saveMut.isPending} />
      </ScrollView>
    </SafeAreaView>
  );
}
