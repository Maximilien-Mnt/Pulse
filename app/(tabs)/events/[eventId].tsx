import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { supabase } from "@/lib/supabase";
import type { EventRow } from "@/types";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Image } from "expo-image";
import * as WebBrowser from "expo-web-browser";
import { ScrollView, Text, View, Pressable, Share } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import { useAuthStore } from "@/stores/authStore";
import { formatDateLong } from "@/utils/date";
import { formatPriceFromCents } from "@/utils/format";

export default function EventDetailScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const router = useRouter();
  const userId = useAuthStore((s) => s.userId);

  const { data: event } = useQuery({
    queryKey: ["event", eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const { data, error } = await supabase.from("events").select("*").eq("id", eventId!).single();
      if (error) throw error;
      return data as EventRow;
    },
  });

  const joinMut = useMutation({
    mutationFn: async () => {
      if (!userId || !event) return;
      const { error } = await supabase.from("event_join_requests").insert({ event_id: event.id, user_id: userId });
      if (error) throw error;
    },
    onSuccess: () => Toast.show({ type: "success", text1: "Demande envoyée" }),
    onError: () => Toast.show({ type: "error", text1: "Erreur" }),
  });

  if (!event) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center">
        <Text>Chargement…</Text>
      </SafeAreaView>
    );
  }

  const hero = event.hero_urls?.[0] ?? event.logo_url;

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-[#0A0F1E]" edges={["top"]}>
      <Stack.Screen options={{ title: event.name }} />
      <View className="flex-row items-center px-3 py-2">
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color="#0F172A" />
        </Pressable>
        <Text className="flex-1 text-center text-lg font-semibold" numberOfLines={1}>
          {event.name}
        </Text>
      </View>
      <ScrollView className="px-4 pb-8">
        {hero ? <Image source={{ uri: hero }} className="w-full h-48 rounded-xl mb-4" contentFit="cover" /> : null}
        <Text className="text-2xl font-bold">{event.name}</Text>
        <View className="flex-row gap-2 mt-2">
          <Badge>{event.sport}</Badge>
          {event.is_external ? <Badge variant="warning">Externe</Badge> : null}
        </View>
        <Text className="mt-2 text-neutral-600 dark:text-neutral-300">{formatDateLong(event.start_date)}</Text>
        <Text className="text-neutral-600">{event.city}, {event.country}</Text>
        <Text className="mt-3 text-base">{event.description}</Text>
        <Text className="mt-2 font-semibold text-primary">{formatPriceFromCents(event.price_cents, event.is_paid)}</Text>
        <View className="flex-row gap-3 mt-6">
          <Button title="Partager" variant="secondary" onPress={() => void Share.share({ message: event.name })} />
        </View>
        {event.is_external && event.registration_url ? (
          <Button title="S'inscrire" onPress={() => void WebBrowser.openBrowserAsync(event.registration_url!)} />
        ) : (
          <Button title="Demander à participer" onPress={() => joinMut.mutate()} loading={joinMut.isPending} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
