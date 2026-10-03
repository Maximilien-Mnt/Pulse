// ---------------------------------------------------------------------------
// PULSE EXPLORE — Club Card
//
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
import { useAuthStore } from "@/stores/authStore";
import { useToggleFavorite } from "@/hooks/useToggleFavorite";
import { CoverOverlayActions } from "@/components/explore/CoverOverlayActions";
import { formatCount } from "@/utils/format";

import { Card } from "@/components/ui/Card";
import { Text } from "@/components/ui/Text";
import { Icon } from "@/components/ui/Icon";
import { SourceBadge } from "@/components/shared/SourceBadge";
import { SportPills, normalizeSports, getSportLabel } from "@/components/shared/SportPill";
import { CardJoinFooter } from "@/components/explore/CardJoinFooter";
import { Avatar } from "@/components/ui/Avatar";
import { t } from "@/hooks/useTranslation";

interface ClubCardProps {
  club: {
    id: string;
    name: string;
    sport?: string;
    /** Every sport practiced (settings `sports[]`); `sport` is the primary one. */
    sports?: string[];
    logo_url?: string | null;
    hero_urls?: string[];
    member_count?: number;
    is_external?: boolean;
    creator?: {
      id: string;
      full_name: string;
      username: string;
      avatar_url?: string | null;
    };
  };
  isCompact?: boolean;
  grid?: boolean;
  initialIsFavorite?: boolean;
}

// When the card is wider than 700px, the cover image moves to the right
const WIDE_CARD_BREAKPOINT = 700;

export function ClubCard({ club, isCompact = false, grid = false, initialIsFavorite }: ClubCardProps) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { data, isLoading: statusLoading } = useJoinRequestStatus("club", club.id);
  const userId = useAuthStore((s) => s.userId);

  const { isFavorited, isPending, toggle } = useToggleFavorite({
    entityType: "club",
    id: club.id,
    queryKeyPrefix: "club-favorite-card",
    includeCount: false,
    initialIsFavorite,
  });

  const handleToggleFavorite = toggle;

  // ── Sports ──────────────────────────────────────────────────────────
  // Every sport the club practices (settings `sports[]`, falling back to the
  // legacy primary `sport` column), rendered as default sport pills.
  const sportIds = normalizeSports(club.sports, club.sport);
  const shareSportLabel = sportIds.map((id) => getSportLabel(id)).join(" · ");

  // ── Share content ──────────────────────────────────────────────────
  const shareContent = {
    title: club.name,
    message: `${club.name} — ${shareSportLabel || "Sport"} | Pulse`,
    url: `https://pulse.app/club/${club.id}`,
  };

  const coverUrl = club.hero_urls?.[0] ?? club.logo_url ?? null;
  const memberCount = club.member_count ?? 0;
  const creator = club.creator;

  const status = deriveStatus(
    data?.isMember ?? false,
    data?.isPending ?? false,
  );

  // The CTA mirrors the club's registration workflow: in-app clubs are joined
  // from Pulse, external clubs register on their own site (via the detail
  // screen, which opens the club's registration link in the browser).
  const joinLabel = club.is_external ? t("common.register") : t("common.join");
  const joinIcon = club.is_external ? ("Globe" as const) : undefined;

  const handlePress = () => {
    router.push(`/(tabs)/explore/club/${club.id}`);
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
        {/* Cover image (actions now live in the title row below) */}
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
              <Icon name="Users" size={24} color="primary" />
            </View>
          )}
        </View>

        {/* Body */}
        <View className="p-2.5 gap-2">
          <View className="flex-row items-start gap-2">
            <Text
              variant="subtitle"
              className="flex-1 text-text-primary text-sm"
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {club.name}
            </Text>
            <CoverOverlayActions
              isFavorite={isFavorited ?? false}
              isPending={isPending}
              onToggleFavorite={handleToggleFavorite}
              shareContent={shareContent}
              size="sm"
              variant="inline"
            />
          </View>

          <View className="flex-row items-center gap-2">
            {creator ? <CreatorAvatar /> : null}
            <View className="flex-row items-center gap-1">
              <Icon name="Users" size={16} color="text-tertiary" />
              <Text variant="caption" className="text-text-tertiary tabular-nums">
                {formatCount(memberCount)}
              </Text>
            </View>
            <SportPills sports={sportIds} size="sm" />
            <SourceBadge isExternal={club.is_external} variant="chip" className="self-center" />
          </View>

          <CardJoinFooter
            status={status}
            joinLabel={joinLabel}
            joinIcon={joinIcon}
            memberLabel="Membre"
            onPress={handlePress}
          />
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
            <View className="flex-row items-start gap-2">
              <Text
                variant="subtitle"
                className="flex-1 text-text-primary"
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {club.name}
              </Text>
              <CoverOverlayActions
                isFavorite={isFavorited ?? false}
                isPending={isPending}
                onToggleFavorite={handleToggleFavorite}
                shareContent={shareContent}
                variant="inline"
              />
            </View>
            {creator ? <CreatorRow /> : null}

            <View className="flex-row flex-wrap items-center gap-3">
              <View className="flex-row items-center gap-1">
                <Icon name="Users" size={16} color="text-tertiary" />
                <Text variant="caption" className="text-text-tertiary tabular-nums">
                  {formatCount(memberCount)}
                </Text>
              </View>
              <SportPills sports={sportIds} size="sm" />
              <SourceBadge isExternal={club.is_external} variant="chip" />
            </View>

            <CardJoinFooter
              status={status}
              joinLabel={joinLabel}
              joinIcon={joinIcon}
              memberLabel="Membre"
              onPress={handlePress}
            />

          </View>

          {/* Right: Cover image (like/share moved to the title row) */}
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
                <Icon name="Users" size={32} color="primary" />
              </View>
            )}
          </View>
        </View>
      ) : (
        // Narrow layout: image on top (default behavior)
        <>
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
                <Icon name="Users" size={32} color="primary" />
              </View>
            )}
          </View>

          <View className="p-4 gap-3">
            <View className="flex-row items-start gap-2">
              <Text
                variant="subtitle"
                className="flex-1 text-text-primary"
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {club.name}
              </Text>
              <CoverOverlayActions
                isFavorite={isFavorited ?? false}
                isPending={isPending}
                onToggleFavorite={handleToggleFavorite}
                shareContent={shareContent}
                variant="inline"
              />
            </View>
            {creator ? <CreatorRow /> : null}

            <View className="flex-row flex-wrap items-center gap-3">
              <View className="flex-row items-center gap-1">
                <Icon name="Users" size={16} color="text-tertiary" />
                <Text variant="caption" className="text-text-tertiary tabular-nums">
                  {formatCount(memberCount)}
                </Text>
              </View>
              <SportPills sports={sportIds} size="sm" />
              <SourceBadge isExternal={club.is_external} variant="chip" />
            </View>

            <CardJoinFooter
              status={status}
              joinLabel={joinLabel}
              joinIcon={joinIcon}
              memberLabel="Membre"
              onPress={handlePress}
            />
          </View>
        </>
      )}
    </Card>
  );
}
