import { Badge } from "@/components/ui/Badge";
import { SourceBadge } from "@/components/shared/SourceBadge";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/utils/format";
import { getCountryDisplay } from "@/utils/countries";
import type { Club } from "@/types";
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/queryClient";
import { useAuthStore } from "@/stores/authStore";
import { useRouter } from "expo-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Image } from "expo-image";
import { Pressable, Share, Text, View } from "react-native";
import Toast from "react-native-toast-message";
import { FavoriteButton } from "@/components/feed/LikeButton";

type Props = { club: Club; compact?: boolean; showDelete?: boolean; onDelete?: () => void };

export function ClubCard({ club, compact, showDelete, onDelete }: Props) {
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

  // Count of total favorites for this club
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
        const { error } = await supabase.from("club_favorites").delete().eq("user_id", userId).eq("club_id", club.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("club_favorites").insert({ user_id: userId, club_id: club.id });
        if (error) throw error;
      }
    },
    // Optimistic UI: flip the favorite state instantly so user sees feedback immediately
    onMutate: async () => {
      const prevIsFav = queryClient.getQueryData(["club-favorite", club.id]);
      const prevCount = queryClient.getQueryData(["club-favorites-count", club.id]) as number | undefined;
      // Assume we're adding a favorite (will be rolled back if it was actually an unlike)
      queryClient.setQueryData(["club-favorite", club.id], true);
      queryClient.setQueryData(["club-favorites-count", club.id], (prevCount ?? 0) + 1);
      return { prevIsFav, prevCount };
    },
    onError: (_err, _vars, context) => {
      // Rollback optimistic change on error
      if (context?.prevIsFav !== undefined) {
        queryClient.setQueryData(["club-favorite", club.id], context.prevIsFav);
      }
      if (context?.prevCount !== undefined) {
        queryClient.setQueryData(["club-favorites-count", club.id], context.prevCount);
      }
    },
    onSettled: () => {
      // Always refetch to confirm the real state
      void queryClient.invalidateQueries({ queryKey: ["club-favorite", club.id] });
      void queryClient.invalidateQueries({ queryKey: ["club-favorites-count", club.id] });
      // Also refresh the clubs list (for filter-based views)
      void queryClient.invalidateQueries({ queryKey: ["clubs"] });
    },
  });

  return (
    <Pressable
      onPress={() => router.push(`/(tabs)/clubs/${club.id}`)}
      className={cn(
        "flex-row bg-white dark:bg-neutral-800 rounded-2xl p-3 mb-3 border border-neutral-100 dark:border-neutral-700",
        compact && "p-2 mb-2"
      )}
    >
      <Image
        source={{ uri: club.logo_url ?? "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=200" }}
        style={{ width: compact ? 48 : 60, height: compact ? 48 : 60, borderRadius: 12 }}
        contentFit="cover"
      />
      <View className="flex-1 ml-3">
        <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-50" numberOfLines={1}>
          {club.name}
        </Text>
        <View className="flex-row flex-wrap gap-2 mt-1 items-center">
          <Badge>{club.sport}</Badge>
          <SourceBadge isExternal={club.is_external} variant="chip" className="self-center" />
        </View>
        <Text className="text-sm text-neutral-500 mt-1" numberOfLines={1}>
          {club.city}, {getCountryDisplay(club.country)} · {club.member_count} membres
        </Text>
      </View>
      <View className="justify-between items-end">
        <View className="flex-row gap-2">
          <FavoriteButton
            isFavorite={!!isFavorited}
            count={favCount ?? undefined}
            isPending={fav.isPending}
            onPress={() => fav.mutate()}
          />
          <Pressable
            onPress={() =>
              Share.share({ message: `${club.name} — ${club.short_description || club.description}` })
            }
            hitSlop={8}
          >
            <Icon name="Share2" size={20} color="text-secondary" />
          </Pressable>
          {showDelete && onDelete && (
            <Pressable onPress={onDelete} hitSlop={8}>
              <Icon name="Trash2" size={20} color="error-500" />
            </Pressable>
          )}
        </View>
      </View>
    </Pressable>
  );
}
