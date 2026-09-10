import { Badge } from "@/components/ui/Badge";
import { SourceBadge } from "@/components/shared/SourceBadge";
import type { Club } from "@/types";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { Dimensions, Pressable, Share, Text, View } from "react-native";
import { FavoriteButton } from "@/components/feed/LikeButton";
import { useToggleFavorite } from "@/hooks/useToggleFavorite";

const COL_W = (Dimensions.get("window").width - 16 * 2 - 8) / 2;

type Props = { club: Club };

export function ClubCardGrid({ club }: Props) {
  const router = useRouter();
  const { isFavorited, favCount, isPending, toggle } = useToggleFavorite({
    entityType: "club",
    id: club.id,
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
            isPending={isPending}
            onPress={toggle}
          />
          <Pressable onPress={() => Share.share({ message: club.name })}>
            <Icon name="Share2" size={20} color="text-secondary" />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}
