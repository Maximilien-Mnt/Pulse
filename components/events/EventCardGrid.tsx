import { Badge } from "@/components/ui/Badge";
import { SourceBadge } from "@/components/shared/SourceBadge";
import { formatPriceFromCents } from "@/utils/format";
import { getSportLabel } from "@/lib/i18n";
import type { EventRow } from "@/types";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { Dimensions, Pressable, Share, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { Icon } from "@/components/ui/Icon";
import { FavoriteButton } from "@/components/feed/LikeButton";
import { useToggleFavorite } from "@/hooks/useToggleFavorite";
import { useTranslation } from "@/hooks/useTranslation";
import { formatDateLong } from "@/utils/date";

const COL_W = (Dimensions.get("window").width - 16 * 2 - 8) / 2;

type Props = { event: EventRow; initialIsFavorite?: boolean; initialFavCount?: number };

export function EventCardGrid({ event, initialIsFavorite, initialFavCount }: Props) {
  const router = useRouter();
  const { t } = useTranslation();
  const { isFavorited, favCount, isPending, toggle } = useToggleFavorite({
    entityType: "event",
    id: event.id,
    initialIsFavorite,
    initialFavCount,
  });

  return (
    <Pressable
      onPress={() => router.push(`/(tabs)/events/${event.id}`)}
      className="bg-surface dark:bg-surface-dark rounded-2xl overflow-hidden mb-3 border border-border dark:border-border-dark"
      style={{ width: COL_W }}
    >
      <Image
        source={{ uri: event.logo_url ?? "https://images.unsplash.com/photo-1517649763962-0c62306601b7?w=400" }}
        style={{ width: COL_W, height: (COL_W * 3) / 4 }}
        contentFit="cover"
      />
      <View className="p-2">
        <Text variant="caption" className="font-semibold text-text-primary" numberOfLines={2}>
          {event.name}
        </Text>
        <Badge>{getSportLabel(event.sport)}</Badge>
        <View className="flex-row items-center justify-between mt-1">
          <Text variant="caption">{formatDateLong(event.start_date)}</Text>
          <SourceBadge isExternal={event.is_external} variant="chip" />
        </View>
        <Text variant="caption" className="font-semibold text-primary mt-1">
          {formatPriceFromCents(event.price_cents, event.is_paid, t("events.priceFree"))}
        </Text>
        <View className="flex-row justify-end gap-2 mt-2">
          <FavoriteButton
            isFavorite={!!isFavorited}
            count={favCount ?? undefined}
            isPending={isPending}
            onPress={toggle}
          />
          <Pressable
            onPress={() => Share.share({ message: event.name })}
            accessibilityRole="button"
            accessibilityLabel={t("events.share")}
            accessibilityHint={t("events.shareAction")}
          >
            <Icon name="Share2" size={20} color="text-secondary" />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}
