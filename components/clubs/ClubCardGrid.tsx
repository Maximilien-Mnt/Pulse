import { Badge } from "@/components/ui/Badge";
import { SourceBadge } from "@/components/shared/SourceBadge";
import type { Club } from "@/types";
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/queryClient";
import { useAuthStore } from "@/stores/authStore";
import { Icon } from "@/components/ui/Icon";
import { useRouter } from "expo-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Image } from "expo-image";
import { Dimensions, Pressable, Share, Text, View } from "react-native";
import { FavoriteButton } from "@/components/feed/LikeButton";

const COL_W = (Dimensions.get("window").width - 16 * 2 - 8) / 2;

type Props = { club: Club };

export function ClubCardGrid({ club }: Props) {
  const router = useRouter();
  const userId = useAuthStore((s) => s.userId);

  // Track whether this user has favorited the club
  const { data: isFavorited, isLoading: loadingFav } = useQuery({
    queryKey: ["club-favorite", club.id],
    queryFn: async () => {
      if (!userId) return false;
      const { data, error } = await supabase
        .from("club_favorites")
        .select("club_id")
        .eq("user_id", userId)
        .eq("club_id", club.id)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
    enabled: !!userId && !!club.id,
    staleTime: 5000,
  });

  const { data: favCount = 0, isLoading: loadingCount } = useQuery({
    queryKey: ["club-favorites-count", club.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("club_favorites")
        .select("*", { count: "exact", head: true })
        .eq("club_id", club.id);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!club.id,
    staleTime: 5000,
  });

  const fav = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("auth");
      const { data: existing } = await supabase
        .from("club_favorites")
        .select("club_id")
        .eq("user_id", userId)
        .eq("club_id", club.id)
        .maybeSingle();
      if (existing) {
        await supabase.from("club_favorites").delete().eq("user_id", userId).eq("club_id", club.id);
      } else {
        await supabase.from("club_favorites").insert({ user_id: userId, club_id: club.id });
      }
    },
    // Optimistic UI: flip the favorite state instantly so user sees feedback immediately
    onMutate: async () => {
      const prevIsFav = queryClient.getQueryData(["club-favorite", club.id]);
      const prevCount = queryClient.getQueryData(["club-favorites-count", club.id]) as number | undefined;
      queryClient.setQueryData(["club-favorite", club.id], true);
      queryClient.setQueryData(["club-favorites-count", club.id], (prevCount ?? 0) + 1);
      return { prevIsFav, prevCount };
    },
    onError: (_err, _vars, context) => {
      if (context?.prevIsFav !== undefined) {
        queryClient.setQueryData(["club-favorite", club.id], context.prevIsFav);
      }
      if (context?.prevCount !== undefined) {
        queryClient.setQueryData(["club-favorites-count", club.id], context.prevCount);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["club-favorite", club.id] });
      void queryClient.invalidateQueries({ queryKey: ["club-favorites-count", club.id] });
      void queryClient.invalidateQueries({ queryKey: ["clubs"] });
    },
  });

  return (
    <Pressable
      onPress={() => router.push(`/(tabs)/clubs/${club.id}`)}
      className="bg-white dark:bg-neutral-800 rounded-2xl overflow-hidden mb-3 border border-neutral-100 dark:border-neutral-700"
      style={{ width: COL_W }}
    >
      <Image
        source={{ uri: club.logo_url ?? "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400" }}
        style={{ width: COL_W, height: (COL_W * 3) / 4 }}
        contentFit="cover"
      />
      <View className="p-2">
        <Text className="text-sm font-semibold text-neutral-900 dark:text-neutral-50" numberOfLines={2}>
          {club.name}
        </Text>
        <View className="flex-row flex-wrap gap-1 mt-1 items-center">
          <Badge>{club.sport}</Badge>
          <SourceBadge isExternal={club.is_external} variant="chip" />
        </View>
        <Text className="text-xs text-neutral-500 mt-1" numberOfLines={1}>
          {club.city}
        </Text>
        <View className="flex-row justify-end gap-2 mt-2">
          <FavoriteButton
            isFavorite={!!isFavorited}
            count={favCount ?? undefined}
            isPending={fav.isPending}
            onPress={() => fav.mutate()}
          />
          <Pressable onPress={() => Share.share({ message: club.name })}>
            <Icon name="Share2" size={20} color="text-secondary" />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}
