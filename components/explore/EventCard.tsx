// ---------------------------------------------------------------------------
// PULSE EXPLORE — Event Card
//
// Similar to ClubCard but with a date badge overlay and event-specific labels.
// Supports three layouts:
//   - list (isCompact): wide layout with image on the right when wide enough
//   - grid (grid): compact card for the multi-column gallery view
//   - default: full-width card with image on top
// ---------------------------------------------------------------------------

import React from "react";
import { View, useWindowDimensions, Pressable } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useJoinRequestStatus, deriveStatus } from "@/hooks/useJoinRequestStatus";
import dayjs from "dayjs";
import "dayjs/locale/fr";

import { Card } from "@/components/ui/Card";
import { Text } from "@/components/ui/Text";
import { Icon } from "@/components/ui/Icon";
import { Tag } from "@/components/ui/Tag";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EventCardProps {
  event: {
    id: string;
    name: string;
    sport?: string;
    start_date: string;
    logo_url?: string | null;
    hero_urls?: string[];
    participant_count?: number;
    difficulty?: number;
    creator?: {
      id: string;
      full_name: string;
      username: string;
      avatar_url?: string | null;
    };
  };
  isCompact?: boolean;
  grid?: boolean;
}

// When the card is wider than 700px, the cover image moves to the right
const WIDE_CARD_BREAKPOINT = 700;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EventCard({ event, isCompact = false, grid = false }: EventCardProps) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { data } = useJoinRequestStatus("event", event.id);

  const coverUrl = event.hero_urls?.[0] ?? event.logo_url ?? null;
  const participantCount = event.participant_count ?? 0;
  const sportLabel = event.sport ?? null;
  const creator = event.creator;

  const status = deriveStatus(
    data?.isMember ?? false,
    data?.isPending ?? false,
  );

  // Date badge
  const dateObj = dayjs(event.start_date).locale("fr");
  const day = dateObj.format("DD");
  const month = dateObj.format("MMM").replace(".", "");

  const handlePress = () => {
    router.push(`/(tabs)/explore/event/${event.id}`);
  };

  const handleCreatorPress = () => {
    if (creator?.id) {
      router.push(`/profile/${creator.id}` as any);
    }
  };

  const authorName = creator?.full_name ?? "Utilisateur";
  const authorUsername = creator?.username ?? "utilisateur";
  const avatarUrl = creator?.avatar_url ?? undefined;

  // List mode only: when the card is wider than 700px, the cover image moves
  // to the right side. In list view, the card width = window width - 32 (padding).
  const imageOnRight = isCompact && !grid && width - 32 > WIDE_CARD_BREAKPOINT;

  const CreatorRow = () => (
    <View className="flex-row items-center gap-2">
      <Pressable
        onPress={handleCreatorPress}
        accessibilityRole="button"
        accessibilityLabel={`Voir le profil de ${authorName}`}
      >
        <Avatar size={20} uri={avatarUrl} />
      </Pressable>
      <Pressable
        onPress={handleCreatorPress}
        accessibilityRole="button"
        accessibilityLabel={`Voir le profil de ${authorName}`}
      >
        <Text variant="caption" className="text-text-secondary">
          {authorName}
        </Text>
      </Pressable>
      <Text variant="caption" className="text-text-tertiary">
        @{authorUsername}
      </Text>
    </View>
  );

  const CreatorAvatar = () => (
    <Pressable
      onPress={handleCreatorPress}
      accessibilityRole="button"
      accessibilityLabel={`Voir le profil de ${authorName}`}
      className="self-start"
    >
      <Avatar size={28} uri={avatarUrl} />
    </Pressable>
  );

  // ------------------------------------------------------------------
  // Grid (compact gallery) layout
  // ------------------------------------------------------------------
  if (grid) {
    return (
      <Card className="mb-3 p-0" onPress={handlePress}>
        {/* Cover image with date badge overlay */}
        <View>
          {coverUrl ? (
            <Image
              source={{ uri: coverUrl }}
              style={{ width: "100%", aspectRatio: 4 / 3, maxHeight: 140 }}
              className="rounded-t-lg"
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          ) : (
            <View
              className="w-full bg-primary-tint items-center justify-center rounded-t-lg"
              style={{ aspectRatio: 4 / 3, maxHeight: 140 }}
            >
              <Icon name="Calendar" size={24} color="primary" />
            </View>
          )}

          {/* Date badge — top-left overlay */}
          <View className="absolute top-2 left-2 bg-surface dark:bg-surface-dark rounded-sm px-2 py-0.5 items-center">
            <Text variant="stat" className="text-text-primary text-sm">
              {day}
            </Text>
            <Text variant="caption" className="text-text-tertiary -mt-1 text-[10px]">
              {month}
            </Text>
          </View>
        </View>

        {/* Body */}
        <View className="p-2.5 gap-2">
          <Text variant="subtitle" className="text-text-primary text-sm" numberOfLines={2}>
            {event.name}
          </Text>

          <View className="flex-row items-center gap-2">
            {creator ? <CreatorAvatar /> : null}
            <View className="flex-row items-center gap-1">
              <Icon name="Users" size={16} color="text-tertiary" />
              <Text variant="caption" className="text-text-tertiary tabular-nums">
                {participantCount}
              </Text>
            </View>
            {sportLabel ? (
              <Tag variant="chip" active={false}>
                {sportLabel}
              </Tag>
            ) : null}
          </View>

          {/* Join button — 3 states with event-specific labels */}
          {status === "member" ? (
            <View className="flex-row items-center gap-1.5 py-1">
              <Icon name="CheckCircle2" size={16} color="success" />
              <Text variant="caption" className="text-success">
                Inscrit
              </Text>
            </View>
          ) : status === "pending" ? (
            <View className="bg-neutral-100 rounded-md py-1.5 items-center">
              <Text variant="buttonLabel" className="text-neutral-500 text-xs">
                Demande envoyée
              </Text>
            </View>
          ) : (
            <Button variant="primary" onPress={handlePress} className="w-full py-1.5">
              Participer
            </Button>
          )}
        </View>
      </Card>
    );
  }

  // ------------------------------------------------------------------
  // List / default layout
  // ------------------------------------------------------------------
  return (
    <Card className="mb-3 p-0" onPress={handlePress}>
      {imageOnRight ? (
        // Wide layout: image on the right, content on the left
        <View style={{ flexDirection: "row" }}>
          {/* Left: Content */}
          <View className="flex-1 p-4 gap-3">
            {creator ? <CreatorRow /> : null}
            <Text variant="subtitle" className="text-text-primary" numberOfLines={2}>
              {event.name}
            </Text>

            <View className="flex-row items-center gap-3">
              <View className="flex-row items-center gap-1">
                <Icon name="Users" size={16} color="text-tertiary" />
                <Text variant="caption" className="text-text-tertiary tabular-nums">
                  {participantCount}
                </Text>
              </View>
              {sportLabel ? (
                <Tag variant="chip" active={false}>
                  {sportLabel}
                </Tag>
              ) : null}
            </View>

            {/* Join button — 3 states with event-specific labels */}
            {status === "member" ? (
              <View className="flex-row items-center gap-2 py-2">
                <Icon name="CheckCircle2" size={16} color="success" />
                <Text variant="caption" className="text-success">
                  Inscrit
                </Text>
              </View>
            ) : status === "pending" ? (
              <View className="bg-neutral-100 rounded-md py-3 items-center">
                <Text variant="buttonLabel" className="text-neutral-500">
                  Demande envoyée
                </Text>
              </View>
            ) : (
              <Button variant="primary" onPress={handlePress} className="w-full">
                Participer
              </Button>
            )}
          </View>

          {/* Right: Cover image with date badge */}
          <View style={{ width: isCompact ? 200 : 260 }}>
            {coverUrl ? (
              <Image
                source={{ uri: coverUrl }}
                style={{ width: "100%", height: "100%" }}
                className="rounded-r-lg"
                contentFit="cover"
                cachePolicy="memory-disk"
              />
            ) : (
              <View className="w-full h-full bg-primary-tint items-center justify-center rounded-r-lg">
                <Icon name="Calendar" size={32} color="primary" />
              </View>
            )}

            {/* Date badge — top-left overlay */}
            <View className="absolute top-3 left-3 bg-surface dark:bg-surface-dark rounded-sm px-2.5 py-1 items-center">
              <Text variant="stat" className="text-text-primary text-lg">
                {day}
              </Text>
              <Text variant="caption" className="text-text-tertiary -mt-1">
                {month}
              </Text>
            </View>
          </View>
        </View>
      ) : (
        // Narrow layout: image on top (default behavior)
        <>
          {/* Cover image with date badge overlay */}
          <View>
            {coverUrl ? (
              <Image
                source={{ uri: coverUrl }}
                style={{
                  width: "100%",
                  aspectRatio: 16 / 9,
                  ...(isCompact ? { maxHeight: 200 } : {})
                }}
                className="rounded-t-lg"
                contentFit="cover"
                cachePolicy="memory-disk"
              />
            ) : (
              <View
                className="w-full bg-primary-tint items-center justify-center rounded-t-lg"
                style={{
                  aspectRatio: 16 / 9,
                  ...(isCompact ? { maxHeight: 200 } : {})
                }}
              >
                <Icon name="Calendar" size={32} color="primary" />
              </View>
            )}

            {/* Date badge — top-left overlay */}
            <View className="absolute top-3 left-3 bg-surface dark:bg-surface-dark rounded-sm px-2.5 py-1 items-center">
              <Text variant="stat" className="text-text-primary text-lg">
                {day}
              </Text>
              <Text variant="caption" className="text-text-tertiary -mt-1">
                {month}
              </Text>
            </View>
          </View>

          {/* Body */}
          <View className="p-4 gap-3">
            {creator ? <CreatorRow /> : null}
            <Text variant="subtitle" className="text-text-primary" numberOfLines={2}>
              {event.name}
            </Text>

            <View className="flex-row items-center gap-3">
              <View className="flex-row items-center gap-1">
                <Icon name="Users" size={16} color="text-tertiary" />
                <Text variant="caption" className="text-text-tertiary tabular-nums">
                  {participantCount}
                </Text>
              </View>
              {sportLabel ? (
                <Tag variant="chip" active={false}>
                  {sportLabel}
                </Tag>
              ) : null}
            </View>

            {/* Join button — 3 states with event-specific labels */}
            {status === "member" ? (
              <View className="flex-row items-center gap-2 py-2">
                <Icon name="CheckCircle2" size={16} color="success" />
                <Text variant="caption" className="text-success">
                  Inscrit
                </Text>
              </View>
            ) : status === "pending" ? (
              <View className="bg-neutral-100 rounded-md py-3 items-center">
                <Text variant="buttonLabel" className="text-neutral-500">
                  Demande envoyée
                </Text>
              </View>
            ) : (
              <Button variant="primary" onPress={handlePress} className="w-full">
                Participer
              </Button>
            )}
          </View>
        </>
      )}
    </Card>
  );
}