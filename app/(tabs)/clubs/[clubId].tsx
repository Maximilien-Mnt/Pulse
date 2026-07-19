import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { InvitationButton } from "@/components/shared/InvitationButton";
import { ClubMembersStrip } from "@/components/clubs/ClubMembersStrip";
import { useClubMembers } from "@/hooks/useClubMembers";
import { supabase } from "@/lib/supabase";
import type { Club } from "@/types";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Image } from "expo-image";
import * as WebBrowser from "expo-web-browser";
import { ScrollView, Share, Text, View, Pressable, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import { useAuthStore } from "@/stores/authStore";
import { queryClient } from "@/lib/queryClient";
import { usePostHog } from "posthog-react-native";

export default function ClubDetailScreen() {
  const { clubId } = useLocalSearchParams<{ clubId: string }>();
  const router = useRouter();
  const posthog = usePostHog();
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

  const { data: members = [] } = useClubMembers(clubId ?? null);

  const joinMut = useMutation({
    mutationFn: async () => {
      if (!userId || !club) return;
      const { error } = await supabase.from("club_join_requests").insert({ club_id: club.id, user_id: userId });
      if (error) throw error;
    },
    onSuccess: () => {
      posthog.capture("club_join_requested", {
        club_id: club?.id ?? null,
        club_name: club?.name ?? null,
        club_sport: club?.sport ?? null,
        is_external: club?.is_external ?? null,
      });
      Toast.show({ type: "success", text1: "Demande envoyée au créateur" });
      void queryClient.invalidateQueries({ queryKey: ["club", clubId] });
    },
    onError: () => Toast.show({ type: "error", text1: "Impossible d'envoyer la demande" }),
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
        {/* Hero gallery */}
        {club.hero_urls.length > 0 ? (
          <FlatList
            horizontal
            data={club.hero_urls}
            keyExtractor={(u) => u}
            showsHorizontalScrollIndicator={false}
            className="mb-4"
            renderItem={({ item }) => (
              <Image source={{ uri: item }} className="w-80 h-48 rounded-xl mr-2" contentFit="cover" />
            )}
          />
        ) : hero ? (
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

        {/* Detailed info */}
        <View className="mt-4 p-4 bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-100 dark:border-neutral-700">
          <Text className="text-sm text-neutral-500">Adresse : {club.address ?? "—"}</Text>
          {club.founded_date ? (
            <Text className="text-sm text-neutral-500 mt-1">Fondation : {club.founded_date}</Text>
          ) : null}
          {club.league ? (
            <Text className="text-sm text-neutral-500 mt-1">Ligue/Division : {club.league}</Text>
          ) : null}
          {club.age_min != null || club.age_max != null ? (
            <Text className="text-sm text-neutral-500 mt-1">
              Tranche d'âge : {club.age_min ?? "—"} – {club.age_max ?? "—"} ans
            </Text>
          ) : null}
          {club.required_level ? (
            <Text className="text-sm text-neutral-500 mt-1">Niveau requis : {club.required_level}</Text>
          ) : null}
          {club.contact_email ? (
            <Text className="text-sm text-neutral-500 mt-1">Contact : {club.contact_email}</Text>
          ) : null}
          <Text className="text-sm text-neutral-500 mt-1">Membres : {club.member_count}</Text>
        </View>

        {/* Members strip */}
        {!club.is_external ? <ClubMembersStrip members={members} /> : null}

        {/* Source link */}
        {club.is_external && club.source_url ? (
          <Pressable
            className="mt-3"
            onPress={() => void WebBrowser.openBrowserAsync(club.source_url!)}
          >
            <Text className="text-primary text-sm font-medium">
              Source : {club.source_name ?? club.source_url}
            </Text>
          </Pressable>
        ) : null}

        <View className="flex-row gap-3 mt-6 mb-10">
          <Button title="Partager" variant="secondary" onPress={() => void Share.share({ message: club.name })} />
        </View>
        {club.is_external && club.registration_url ? (
          <Button title="S'inscrire" onPress={() => void WebBrowser.openBrowserAsync(club.registration_url!)} />
        ) : (
          <Button title="Rejoindre le club" onPress={() => joinMut.mutate()} loading={joinMut.isPending} />
        )}
        <InvitationButton
          type="club"
          targetId={club.id}
          visible={!!userId && club.created_by === userId && !!club.is_private}
          className="mt-3 mb-10"
        />
      </ScrollView>
    </SafeAreaView>
  );
}