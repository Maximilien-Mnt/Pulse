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
import { useQuery, useMutation } from "@tanstack/react-query";
import { Image } from "expo-image";
import { Pressable, Share, Text, View } from "react-native";
import { FavoriteButton } from "@/components/feed/LikeButton";

type Props = { event: EventRow; compact?: boolean };

function Stars({ n }: { n: number }) {
  return (
    <View className="flex-row">
      {Array.from({ length: 5 }).map((_, i) => (
        <Icon key={i} name="Star" size={14} color="warning-500" filled={i < n} />
      ))}
    </View>
  );
}

export function EventCard({ event, compact }: Props) {
  const router = useRouter();
  const userId = useAuthStore((s) => s.userId);

  // Track whether this user has favorited the event
  const { data: isFavorited, isLoading: loadingFav } = useQuery({
    queryKey: ["event-favorite", event.id],
    queryFn: async () => {
      if (!userId) return false;
      const { data, error } = await supabase
        .from("event_favorites")
        .select("event_id")
        .eq("user_id", userId)
        .eq("event_id", event.id)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
    enabled: !!userId && !!event.id,
    staleTime: 5000,
  });

  const { data: favCount = 0, isLoading: loadingCount } = useQuery({
    queryKey: ["event-favorites-count", event.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("event_favorites")
        .select("*", { count: "exact", head: true })
        .eq("event_id", event.id);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!event.id,
    staleTime: 5000,
  });

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
    onMutate: async () => {
      const prevIsFav = queryClient.getQueryData(["event-favorite", event.id]);
      const prevCount = queryClient.getQueryData(["event-favorites-count", event.id]) as number | undefined;
      queryClient.setQueryData(["event-favorite", event.id], true);
      queryClient.setQueryData(["event-favorites-count", event.id], (prevCount ?? 0) + 1);
      return { prevIsFav, prevCount };
    },
    onError: (_err, _vars, context) => {
      if (context?.prevIsFav !== undefined) {
        queryClient.setQueryData(["event-favorite", event.id], context.prevIsFav);
      }
      if (context?.prevCount !== undefined) {
        queryClient.setQueryData(["event-favorites-count", event.id], context.prevCount);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["event-favorite", event.id] });
      void queryClient.invalidateQueries({ queryKey: ["event-favorites-count", event.id] });
      void queryClient.invalidateQueries({ queryKey: ["events"] });
    },
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
          <SourceBadge isExternal={event.is_external} variant="chip" className="self-center" />
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
          <FavoriteButton
            isFavorite={!!isFavorited}
            count={favCount ?? undefined}
            isPending={fav.isPending}
            onPress={() => fav.mutate()}
          />
        <Pressable onPress={() => Share.share({ message: event.name })} hitSlop={8}>
          <Icon name="Share2" size={22} color="text-secondary" />
        </Pressable>
      </View>
    </Pressable>
  );
}