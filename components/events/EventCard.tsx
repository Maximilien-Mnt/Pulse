import { Badge } from "@/components/ui/Badge";
import { formatPriceFromCents } from "@/utils/format";
import type { EventRow } from "@/types";
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/queryClient";
import { useAuthStore } from "@/stores/authStore";
import { formatDateLong } from "@/utils/date";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { Image } from "expo-image";
import { Pressable, Share, Text, View } from "react-native";

type Props = { event: EventRow; compact?: boolean };

function Stars({ n }: { n: number }) {
  return (
    <View className="flex-row">
      {Array.from({ length: 5 }).map((_, i) => (
        <Ionicons key={i} name={i < n ? "star" : "star-outline"} size={14} color="#F59E0B" />
      ))}
    </View>
  );
}

export function EventCard({ event, compact }: Props) {
  const router = useRouter();
  const userId = useAuthStore((s) => s.userId);

  const fav = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("auth");
      const { data: existing } = await supabase
        .from("event_favorites")
        .select("event_id")
        .eq("user_id", userId)
        .eq("event_id", event.id)
        .maybeSingle();
      if (existing) {
        await supabase.from("event_favorites").delete().eq("user_id", userId).eq("event_id", event.id);
      } else {
        await supabase.from("event_favorites").insert({ user_id: userId, event_id: event.id });
      }
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["events"] }),
  });

  return (
    <Pressable
      onPress={() => router.push(`/(tabs)/events/${event.id}`)}
      className="flex-row bg-white dark:bg-neutral-800 rounded-2xl p-3 mb-3 border border-neutral-100 dark:border-neutral-700"
    >
      <Image
        source={{ uri: event.logo_url ?? "https://images.unsplash.com/photo-1517649763962-0c62306601b7?w=200" }}
        style={{ width: compact ? 48 : 60, height: compact ? 48 : 60, borderRadius: 12 }}
        contentFit="cover"
      />
      <View className="flex-1 ml-3">
        <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-50" numberOfLines={2}>
          {event.name}
        </Text>
        <View className="flex-row flex-wrap gap-2 mt-1 items-center">
          <Badge>{event.sport}</Badge>
          {event.is_external ? <Badge variant="warning">Externe</Badge> : null}
        </View>
        <Text className="text-sm text-neutral-500 mt-1">{formatDateLong(event.start_date)}</Text>
        <Text className="text-sm text-neutral-500">{event.city}</Text>
        <View className="flex-row items-center justify-between mt-2">
          <Text className="text-sm font-semibold text-primary">
            {formatPriceFromCents(event.price_cents, event.is_paid)}
          </Text>
          <Stars n={event.difficulty} />
        </View>
      </View>
      <View className="justify-between items-end">
        <Pressable onPress={() => fav.mutate()} hitSlop={8}>
          <Ionicons name="heart-outline" size={22} color="#64748B" />
        </Pressable>
        <Pressable onPress={() => Share.share({ message: event.name })} hitSlop={8}>
          <Ionicons name="share-social-outline" size={22} color="#64748B" />
        </Pressable>
      </View>
    </Pressable>
  );
}
