// ---------------------------------------------------------------------------
// PULSE PROFILE SCREEN
//
// Cover image (3:1), avatar 96px overlay, H1 name, body bio, sport chips,
// stats row, public profile toggle, edit button, settings access.
// ---------------------------------------------------------------------------

import React, { useCallback, useState } from "react";
import {
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/stores/authStore";
import { useProfile } from "@/hooks/useProfile";
import { useUserSports } from "@/hooks/useUserSports";
import { useMyClubMemberships } from "@/hooks/useMyClubMemberships";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { SPORTS } from "@/lib/constants";

import { Text } from "@/components/ui/Text";
import { Icon } from "@/components/ui/Icon";
import { Tag } from "@/components/ui/Tag";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Skeleton } from "@/components/ui/Skeleton";
import { GoPublicSheet } from "@/components/profile/GoPublicSheet";
import { SafeScreen } from "@/components/shared/SafeScreen";

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
// Stats row
// ---------------------------------------------------------------------------

function StatsRow({
  posts,
  clubs,
  followers,
}: {
  posts: number;
  clubs: number;
  followers: number;
}) {
  return (
    <View className="flex-row py-4">
      <View className="flex-1 items-center">
        <Text variant="stat" className="text-text-primary tabular-nums">
          {posts}
        </Text>
        <Text variant="caption" className="text-text-tertiary mt-1">
          Posts
        </Text>
      </View>
      <View className="flex-1 items-center">
        <Text variant="stat" className="text-text-primary tabular-nums">
          {clubs}
        </Text>
        <Text variant="caption" className="text-text-tertiary mt-1">
          Clubs
        </Text>
      </View>
      <View className="flex-1 items-center">
        <Text variant="stat" className="text-text-primary tabular-nums">
          {followers}
        </Text>
        <Text variant="caption" className="text-text-tertiary mt-1">
          Abonnés
        </Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function ProfileScreen() {
  const userId = useAuthStore((s) => s.userId);
  const router = useRouter();
  const { data: profile, isLoading, isError, refetch } = useProfile(userId);
  const { data: userSports } = useUserSports(userId, "practiced");
  const { data: memberships } = useMyClubMemberships(userId);
  const [goPublicOpen, setGoPublicOpen] = useState(false);

  // Post count
  const { data: postCount = 0 } = useQuery({
    queryKey: ["post-count", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .eq("author_id", userId!);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const isPublic = profile?.is_public_profile ?? false;

  if (isLoading) return <ProfileSkeleton />;

  const coverUrl = profile?.avatar_url ?? null;
  const name = profile?.full_name ?? "Utilisateur";
  const bio = profile?.bio ?? "";
  const sports: string[] = userSports ?? [];
  const clubCount = memberships?.length ?? 0;

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
            <Avatar
              uri={coverUrl}
              size={96}
              className="border-[3px] border-surface"
            />
          </View>
        </View>

        {/* Body */}
        <View className="px-4 mt-14 gap-4">
          {/* Name */}
          <Text variant="h1" className="text-text-primary">
            {name}
          </Text>

          {/* Name tag (username) */}
          {profile?.username ? (
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

          {/* Sport chips */}
          {sports.length > 0 ? (
            <View className="flex-row flex-wrap gap-2">
              {sports.map((s) => (
                <Tag key={s} variant="chip" active={false}>
                  {SPORTS.find((sp) => sp.id === s)?.label ?? s}
                </Tag>
              ))}
            </View>
          ) : null}

          {/* Stats */}
          <StatsRow
            posts={postCount}
            clubs={clubCount}
            followers={0}
          />

          {/* Divider */}
          <View className="border-t border-border" />

          {/* Public profile activation button (only visible when profile is private) */}
          {!isPublic && (
            <View className="py-4">
              <Text variant="subtitle" className="text-text-primary mb-2">
                Profil public
              </Text>
              <Text variant="caption" className="text-text-tertiary mb-3">
                Un profil public permet de créer des posts visibles par tous.
                Cette action est irréversible.
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
                Notifications
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
                Paramètres
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
                Clubs
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
                Événements acceptés
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
                    Mes posts
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