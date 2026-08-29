// ---------------------------------------------------------------------------
// PULSE PROFILE SCREEN (Personal)
//
// Cover image (3:1), avatar 96px overlay, name, username, bio, then the same
// clean, UI/UX-optimised sections as a public profile:
//   - Stats grid (6 tiles when public, only clubs + events when private)
//   - Sports & statuts, sports interested in, and objectives
// Then the public/private info and the notifications / clubs / settings
// subscreens access rows.
// ---------------------------------------------------------------------------

import React, { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/stores/authStore";
import { usePublicProfile, parsePublicStatus } from "@/hooks/usePublicProfile";
import { useTranslation , t } from "@/hooks/useTranslation";

import { Text } from "@/components/ui/Text";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { GoPublicSheet } from "@/components/profile/GoPublicSheet";
import { SafeScreen } from "@/components/shared/SafeScreen";
import {
  StatsGrid,
  SportStatusCard,
  InterestedSportsCard,
  ObjectivesCard,
} from "@/components/profile/ProfileSections";

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function ProfileSkeleton() {
  return (
    <SafeScreen edges={["top"]}>
      <Skeleton className="w-full h-32 rounded-none" />
      <View className="px-4 gap-4 -mt-12">
        <Skeleton className="w-24 h-24 rounded-full" />
        <Skeleton className="w-48 h-6 rounded-sm" />
        <Skeleton className="w-full h-8 rounded-sm" />
        <View className="flex-row gap-2">
          <Skeleton className="w-16 h-8 rounded-full" />
          <Skeleton className="w-16 h-8 rounded-full" />
        </View>
      </View>
    </SafeScreen>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function ProfileScreen() {
  const userId = useAuthStore((s) => s.userId);
  const router = useRouter();
  const { t } = useTranslation();
  const { data: profile, isLoading, isError, error, refetch } = usePublicProfile(userId);
  const [goPublicOpen, setGoPublicOpen] = useState(false);

  if (isLoading) return <ProfileSkeleton />;

  if (isError || !profile) {
    return (
      <SafeScreen edges={["top"]}>
        <ErrorState message={error?.message ?? t("common.error")} onRetry={() => void refetch()} />
      </SafeScreen>
    );
  }

  const isPublic = profile.is_public_profile;
  const coverUrl = profile.avatar_url ?? null;
  const name = profile.full_name ?? t("common.userNotFound");
  const bio = profile.bio ?? "";
  const statusMap = parsePublicStatus(profile.public_status);
  return (
    <SafeScreen edges={["top"]}>
      <ScrollView bounces={false}>
        {/* Cover */}
        <View>
          {coverUrl ? (
            <Image
              key={coverUrl}
              source={{ uri: coverUrl }}
              style={{ width: "100%", height: 220 }}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          ) : (
            <View className="w-full bg-primary-tint" style={{ height: 220 }} />
          )}

          {/* Avatar overlay */}
          <View className="absolute bottom-0 left-4 translate-y-1/2">
            <Avatar uri={coverUrl} size={96} className="border-[3px] border-surface" />
          </View>
        </View>

        {/* Header */}
        <View className="px-4 mt-14">
          {/* Name */}
          <Text variant="h1" className="text-text-primary">
            {name}
          </Text>

          {/* Name tag (username) */}
          {profile.username ? (
            <Text variant="caption" className="text-text-tertiary -mt-1">
              @{profile.username}
            </Text>
          ) : null}

          {/* Bio */}
          {bio ? (
            <Text variant="body" className="text-text-secondary">
              {bio}
            </Text>
          ) : null}
        </View>

        {/* Content sections — same as a public profile */}
        <View className="px-4">
          {/* Stats grid (gated by visibility: 6 public / 2 private) */}
          <StatsGrid stats={profile.stats ?? null} isPublic={isPublic} />

          {/* Sports practiced */}
          <SportStatusCard
            sports={profile.sports ?? []}
            statusMap={statusMap}
            onEditPress={() =>
              router.push("/profile/edit-profile?focusSection=practiced" as any)
            }
          />

          {/* Sports interested in */}
          <InterestedSportsCard
            sports={profile.interested_sports ?? []}
            onEditPress={() =>
              router.push("/profile/edit-profile?focusSection=interested" as any)
            }
          />

          {/* Objectives */}
          <ObjectivesCard
            objectives={profile.objectives ?? []}
            onEditPress={() =>
              router.push("/profile/edit-profile?focusSection=objectives" as any)
            }
          />

          {/* Divider */}
          <View className="border-t border-border mt-4" />

          {/* Public profile activation button (only visible when profile is private) */}
          {!isPublic && (
            <View className="py-4">
              <Text variant="subtitle" className="text-text-primary mb-2">
                {t("profile.section.public")}
              </Text>
              <Text variant="caption" className="text-text-tertiary mb-3">
                {t("common.publicProfileInfo")}
                {t("common.irreversible")}
              </Text>
              <Button
                title="Activer le profil public"
                variant="primary"
                onPress={() => setGoPublicOpen(true)}
              />
            </View>
          )}

          {/* Public profile status (only visible when profile is public) */}
          {isPublic && (
            <View className="flex-row items-center justify-between py-4">
              <View className="flex-1 mr-4">
                <Text variant="subtitle" className="text-text-primary">
                  Profil public actif
                </Text>
                <Text variant="caption" className="text-text-tertiary mt-1">
                  Votre profil est visible par tous les utilisateurs.
                </Text>
              </View>
              <Icon name="CheckCircle2" size={24} color="success" />
            </View>
          )}

          {/* Divider */}
          <View className="border-t border-border" />
{/* Notifications access */}
          <Pressable
            onPress={() => router.push("/(tabs)/profile/notifications" as any)}
            className="flex-row items-center justify-between py-4"
          >
            <View className="flex-row items-center gap-3">
              <Icon name="Bell" size={20} color="text-secondary" />
              <Text variant="body" className="text-text-secondary">
                {t("profile.notificationsSection")}
              </Text>
            </View>
            <Icon name="Search" size={16} color="text-tertiary" />
          </Pressable>

          {/* Divider */}
          <View className="border-t border-border" />

          {/* Settings access */}
          <Pressable
            onPress={() => router.push("/(tabs)/profile/settings" as any)}
            className="flex-row items-center justify-between py-4"
          >
            <View className="flex-row items-center gap-3">
              <Icon name="Settings" size={20} color="text-secondary" />
              <Text variant="body" className="text-text-secondary">
                {t("profile.settings")}
              </Text>
            </View>
            <Icon name="Search" size={16} color="text-tertiary" />
          </Pressable>

          {/* Divider */}
          <View className="border-t border-border" />

          {/* Clubs */}
          <Pressable
            onPress={() => router.push("/(tabs)/profile/clubs" as any)}
            className="flex-row items-center justify-between py-4"
          >
            <View className="flex-row items-center gap-3">
              <Icon name="Users" size={20} color="text-secondary" />
              <Text variant="body" className="text-text-secondary">
                {t("profile.clubs")}
              </Text>
            </View>
            <Icon name="Search" size={16} color="text-tertiary" />
          </Pressable>

          {/* Divider */}
          <View className="border-t border-border" />

          {/* Accepted Events */}
          <Pressable
            onPress={() => router.push("/(tabs)/profile/accepted-events" as any)}
            className="flex-row items-center justify-between py-4"
          >
            <View className="flex-row items-center gap-3">
              <Icon name="CheckCircle2" size={20} color="text-secondary" />
              <Text variant="body" className="text-text-secondary">
                {t("profile.acceptedEvents")}
              </Text>
            </View>
            <Icon name="Search" size={16} color="text-tertiary" />
          </Pressable>

          {/* Divider */}
          <View className="border-t border-border" />

          {/* My Posts - only visible for public profiles */}
          {isPublic && (
            <>
              <Pressable
                onPress={() => router.push("/(tabs)/profile/user-posts" as any)}
                className="flex-row items-center justify-between py-4"
              >
                <View className="flex-row items-center gap-3">
                  <Icon name="Image" size={20} color="text-secondary" />
                  <Text variant="body" className="text-text-secondary">
                    {t("profile.myPosts")}
                  </Text>
                </View>
                <Icon name="Search" size={16} color="text-tertiary" />
              </Pressable>

              {/* Divider */}
              <View className="border-t border-border" />
            </>
          )}
        </View>

        <View className="h-8" />
      </ScrollView>

      {/* Go public sheet */}
      <GoPublicSheet visible={goPublicOpen} onClose={() => setGoPublicOpen(false)} />
    </SafeScreen>
  );
}