import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { supabase } from "@/lib/supabase";
import type { Club } from "@/types";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Image } from "expo-image";
import * as WebBrowser from "expo-web-browser";
import { ScrollView, Share, Text, View, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import { useAuthStore } from "@/stores/authStore";
import { queryClient } from "@/lib/queryClient";

export default function ClubDetailScreen() {
  const { clubId } = useLocalSearchParams<{ clubId: string }>();
  const router = useRouter();
  const userId = useAuthStore((s) => s.userId);

  const { data: club, refetch } = useQuery({
    queryKey: ["club", clubId],
    enabled: !!clubId,
    queryFn: async () => {
      const { data, error } = await supabase.from("clubs").select("*").eq("id", clubId!).single();
      if (error) throw error;
      return data as Club;
    },
  });

  const joinMut = useMutation({
    mutationFn: async () => {
      if (!userId || !club) return;
      const { error } = await supabase.from("club_join_requests").insert({ club_id: club.id, user_id: userId });
      if (error) throw error;
    },
    onSuccess: () => {
      Toast.show({ type: "success", text1: "Demande envoyée au créateur" });
      void queryClient.invalidateQueries({ queryKey: ["club", clubId] });
    },
    onError: () => Toast.show({ type: "error", text1: "Impossible d’envoyer la demande" }),
  });

  if (!club) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center">
        <Text>Chargement…</Text>
      </SafeAreaView>
    );
  }

  const hero = club.hero_urls?.[0] ?? club.logo_url;

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-[#0A0F1E]" edges={["top"]}>
      <Stack.Screen options={{ title: club.name }} />
      <View className="flex-row items-center px-3 py-2">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={28} color="#0F172A" />
        </Pressable>
        <Text className="flex-1 text-center text-lg font-semibold text-neutral-900 dark:text-neutral-50" numberOfLines={1}>
          {club.name}
        </Text>
      </View>
      <ScrollView className="flex-1 px-4">
        {hero ? (
          <Image source={{ uri: hero }} className="w-full h-48 rounded-xl mb-4" contentFit="cover" />
        ) : null}
        <View className="flex-row items-center gap-3 mb-2">
          {club.logo_url ? (
            <Image source={{ uri: club.logo_url }} style={{ width: 60, height: 60, borderRadius: 30 }} />
          ) : null}
          <View className="flex-1">
            <Text className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">{club.name}</Text>
            <View className="flex-row gap-2 mt-1">
              <Badge>{club.sport}</Badge>
              {club.is_external ? <Badge variant="warning">Source externe</Badge> : null}
            </View>
            <Text className="text-neutral-500 mt-1">
              {club.city}, {club.country}
            </Text>
          </View>
        </View>
        <Text className="text-base text-neutral-800 dark:text-neutral-100 mt-2">{club.description}</Text>
        <Text className="text-sm text-neutral-500 mt-4">
          Adresse : {club.address ?? "—"}
        </Text>
        <Text className="text-sm text-neutral-500">Membres : {club.member_count}</Text>
        <View className="flex-row gap-3 mt-6 mb-10">
          <Button title="Partager" variant="secondary" onPress={() => void Share.share({ message: club.name })} />
        </View>
        {club.is_external && club.registration_url ? (
          <Button title="S'inscrire" onPress={() => void WebBrowser.openBrowserAsync(club.registration_url!)} />
        ) : (
          <Button title="Rejoindre le club" onPress={() => joinMut.mutate()} loading={joinMut.isPending} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
