import { Badge } from "@/components/ui/Badge";
import { SourceBadge } from "@/components/shared/SourceBadge";
import { formatPriceFromCents } from "@/utils/format";
import type { EventRow } from "@/types";
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/queryClient";
import { useAuthStore } from "@/stores/authStore";
import { formatDateLong } from "@/utils/date";
import { Icon } from "@/components/ui/Icon";
import { useRouter } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { Image } from "expo-image";
import { Dimensions, Pressable, Share, Text, View } from "react-native";

const COL_W = (Dimensions.get("window").width - 16 * 2 - 8) / 2;

type Props = { event: EventRow };

export function EventCardGrid({ event }: Props) {
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
      className="bg-white dark:bg-neutral-800 rounded-2xl overflow-hidden mb-3 border border-neutral-100 dark:border-neutral-700"
      style={{ width: COL_W }}
    >
      <Image
        source={{ uri: event.logo_url ?? "https://images.unsplash.com/photo-1517649763962-0c62306601b7?w=400" }}
        style={{ width: COL_W, height: (COL_W * 3) / 4 }}
        contentFit="cover"
      />
      <View className="p-2">
        <Text className="text-sm font-semibold text-neutral-900 dark:text-neutral-50" numberOfLines={2}>
          {event.name}
        </Text>
        <Badge>{event.sport}</Badge>
        <View className="flex-row items-center justify-between mt-1">
          <Text className="text-xs text-neutral-500">{formatDateLong(event.start_date)}</Text>
          <SourceBadge isExternal={event.is_external} variant="chip" />
        </View>
        <Text className="text-xs font-semibold text-primary mt-1">
          {formatPriceFromCents(event.price_cents, event.is_paid)}
        </Text>
        <View className="flex-row justify-end gap-2 mt-2">
          <Pressable onPress={() => fav.mutate()}>
            <Icon name="Heart" size={20} color="text-secondary" />
          </Pressable>
          <Pressable onPress={() => Share.share({ message: event.name })}>
            <Icon name="Share2" size={20} color="text-secondary" />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}
