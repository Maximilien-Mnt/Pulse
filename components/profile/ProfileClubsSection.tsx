// ---------------------------------------------------------------------------
// PULSE PROFILE — CLUBS SECTION
//
// Lists the signed-in user's clubs directly on the profile screen, split into:
//   - "Clubs rejoints" (memberships) → the club public page
//   - "Clubs créés"     (clubs they created) → the club dashboard
// ---------------------------------------------------------------------------

import React from "react";
import { Pressable, View } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { Text } from "@/components/ui/Text";
import { getCountryDisplay } from "@/utils/countries";
import type { Club } from "@/types";
import { useTranslation } from "@/hooks/useTranslation";

const FALLBACK_LOGO =
  "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=200";

type Props = {
  clubsJoined: Club[];
  clubsCreated: Club[];
  isLoading?: boolean;
};

function ClubRow({ club, onPress }: { club: Club; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 py-2.5 rounded-lg"
      accessibilityRole="button"
      accessibilityLabel={club.name}
    >
      <Image
        source={{ uri: club.logo_url ?? FALLBACK_LOGO }}
        style={{ width: 40, height: 40, borderRadius: 10 }}
        contentFit="cover"
      />
      <View className="flex-1 min-w-0">
        <Text
          className="text-sm font-semibold text-neutral-900 dark:text-neutral-50"
          numberOfLines={1}
        >
          {club.name}
        </Text>
        <Text className="text-xs text-neutral-500" numberOfLines={1}>
          {club.city}, {getCountryDisplay(club.country)}
        </Text>
      </View>
      <Icon name="ChevronRight" size={16} color="text-tertiary" />
    </Pressable>
  );
}

export function ProfileClubsSection({ clubsJoined, clubsCreated, isLoading }: Props) {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <Card className="mt-4 p-4">
      {/* Section header */}
      <View className="flex-row items-center gap-2 mb-1">
        <Icon name="Users" size={20} color="accent" />
        <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
          {t("profile.clubs")}
        </Text>
      </View>

      {/* Clubs rejoints */}
      <Text variant="overline" className="mb-2">
        {t("profile.joinedClubs")}
      </Text>
      {isLoading ? (
        <Text variant="caption" className="py-1">{t("common.loading")}</Text>
      ) : clubsJoined.length === 0 ? (
        <Text variant="caption" className="py-1">{t("clubs.emptyMember")}</Text>
      ) : (
        clubsJoined.map((cl) => (
          <ClubRow
            key={cl.id}
            club={cl}
            onPress={() => router.push(`/(tabs)/clubs/${cl.id}` as any)}
          />
        ))
      )}

      {/* Divider */}
      <View className="border-t border-border dark:border-border-dark my-3" />

      {/* Clubs créés */}
      <Text variant="overline" className="mb-2">
        {t("profile.createdClubs")}
      </Text>
      {isLoading ? (
        <Text variant="caption" className="py-1">{t("common.loading")}</Text>
      ) : clubsCreated.length === 0 ? (
        <Text variant="caption" className="py-1">{t("clubs.emptyCreated")}</Text>
      ) : (
        clubsCreated.map((cl) => (
          <ClubRow
            key={cl.id}
            club={cl}
            onPress={() => router.push(`/(tabs)/clubs/${cl.id}/dashboard` as any)}
          />
        ))
      )}
    </Card>
  );
}
