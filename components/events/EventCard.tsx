import { Badge } from "@/components/ui/Badge";
import { SourceBadge } from "@/components/shared/SourceBadge";
import { formatPriceFromCents } from "@/utils/format";
import type { ClubEventRow } from "@/hooks/clubProjections";
import { useRouter } from "expo-router";
import { Icon } from "@/components/ui/Icon";
import { Image } from "expo-image";
import { Pressable, Share, Text, View } from "react-native";
import { FavoriteButton } from "@/components/feed/LikeButton";
import { useTranslation } from "@/hooks/useTranslation";
import { formatDateLong } from "@/utils/date";
import { useToggleFavorite } from "@/hooks/useToggleFavorite";

type Props = { event: ClubEventRow; compact?: boolean; onCancel?: () => void; showCancel?: boolean; initialIsFavorite?: boolean; initialFavCount?: number };

function Stars({ n }: { n: number }) {
  return (
    <View className="flex-row">
      {Array.from({ length: 5 }).map((_, i) => (
        <Icon key={i} name="Star" size={14} color="warning-500" filled={i < n} />
      ))}
    </View>
  );
}

export function EventCard({ event, compact, onCancel, showCancel, initialIsFavorite, initialFavCount }: Props) {
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
            {formatPriceFromCents(event.price_cents, event.is_paid, t("events.priceFree"))}
          </Text>
          <Stars n={event.difficulty} />
        </View>
      </View>
      <View className="justify-between items-end">
          {showCancel && onCancel ? (
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                onCancel();
              }}
              hitSlop={8}
              className="w-8 h-8 rounded-full bg-error-500/10 items-center justify-center mb-1"
              accessibilityRole="button"
              accessibilityLabel={t("events.cancelAction")}
            >
              <Icon name="X" size={16} color="error-500" />
            </Pressable>
          ) : null}
          <FavoriteButton
            isFavorite={!!isFavorited}
            count={favCount ?? undefined}
            isPending={isPending}
            onPress={toggle}
          />
        <Pressable onPress={() => Share.share({ message: event.name })} hitSlop={8}>
          <Icon name="Share2" size={22} color="text-secondary" />
        </Pressable>
      </View>
    </Pressable>
  );
}
