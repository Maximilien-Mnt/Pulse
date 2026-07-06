import { Badge } from "@/components/ui/Badge";
import type { Club } from "@/types";
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/queryClient";
import { useAuthStore } from "@/stores/authStore";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { Image } from "expo-image";
import { Dimensions, Pressable, Share, Text, View } from "react-native";

const COL_W = (Dimensions.get("window").width - 16 * 2 - 8) / 2;

type Props = { club: Club };

export function ClubCardGrid({ club }: Props) {
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
        await supabase.from("club_favorites").delete().eq("user_id", userId).eq("club_id", club.id);
      } else {
        await supabase.from("club_favorites").insert({ user_id: userId, club_id: club.id });
      }
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["clubs"] }),
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
        <View className="flex-row flex-wrap gap-1 mt-1">
          <Badge>{club.sport}</Badge>
          {club.is_external ? <Badge variant="warning">Ext.</Badge> : null}
        </View>
        <Text className="text-xs text-neutral-500 mt-1" numberOfLines={1}>
          {club.city}
        </Text>
        <View className="flex-row justify-end gap-2 mt-2">
          <Pressable onPress={() => fav.mutate()}>
            <Ionicons name="heart-outline" size={20} color="#64748B" />
          </Pressable>
          <Pressable onPress={() => Share.share({ message: club.name })}>
            <Ionicons name="share-social-outline" size={20} color="#64748B" />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}
