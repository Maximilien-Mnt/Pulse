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
import { useMutation } from "@tanstack/react-query";
import { Image } from "expo-image";
import { Pressable, Share, Text, View } from "react-native";
import Toast from "react-native-toast-message";

type Props = { club: Club; compact?: boolean; showDelete?: boolean; onDelete?: () => void };

export function ClubCard({ club, compact, showDelete, onDelete }: Props) {
  const router = useRouter();
  const userId = useAuthStore((s) => s.userId);

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
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["clubs"] }),
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
          <Pressable onPress={() => fav.mutate()} hitSlop={8}>
            <Icon name="Heart" size={20} color="text-secondary" />
          </Pressable>
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
