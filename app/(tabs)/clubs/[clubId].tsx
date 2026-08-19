import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { InvitationButton } from "@/components/shared/InvitationButton";
import { ClubMembersStrip } from "@/components/clubs/ClubMembersStrip";
import { MembersListSheet, type Member } from "@/components/shared/MembersListSheet";
import { EditClubEventSheet } from "@/components/shared/EditClubEventSheet";
import { useClubMembers } from "@/hooks/useClubMembers";
import { useJoinRequestStatus } from "@/hooks/useJoinRequestStatus";
import { useUpdateClub } from "@/hooks/useUpdateClub";
import { supabase } from "@/lib/supabase";
import type { Club } from "@/types";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Image } from "expo-image";
import * as WebBrowser from "expo-web-browser";
import { ScrollView, Share, Text, View, Pressable, FlatList, ActivityIndicator } from "react-native";
import { useState } from "react";
import { SafeScreen } from "@/components/shared/SafeScreen";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import { useAuthStore } from "@/stores/authStore";
import { queryClient } from "@/lib/queryClient";
import { usePostHog } from "posthog-react-native";
import { getCountryDisplay } from "@/utils/countries";
import { Avatar } from "@/components/ui/Avatar";
import { BackButton } from "@/components/ui/BackButton";

export default function ClubDetailScreen() {
  const { clubId } = useLocalSearchParams<{ clubId: string }>();
  const router = useRouter();
  const posthog = usePostHog();
  const userId = useAuthStore((s) => s.userId);

  const { data: club } = useQuery({
    queryKey: ["club", clubId],
    enabled: !!clubId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clubs")
        .select("*")
        .eq("id", clubId!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return data as Club;
    },
  });

  const { data: creator } = useQuery({
    queryKey: ["club-creator", club?.created_by],
    enabled: !!club?.created_by,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url")
        .eq("id", club!.created_by as string)
        .maybeSingle();
      if (error) throw error;
      if (!data) return undefined;
      return {
        id: data.id,
        full_name: data.full_name ?? "Utilisateur",
        username: data.username ?? "utilisateur",
        avatar_url: data.avatar_url ?? null,
      };
    },
  });

  const { data: members = [] } = useClubMembers(clubId ?? null);

  // Fetch all members for the full list (no limit)
  const { data: allMembers = [], isLoading: loadingAllMembers } = useQuery({
    queryKey: ["club-all-members", clubId],
    enabled: !!clubId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("club_members")
        .select("user_id")
        .eq("club_id", clubId!);

      if (error) throw error;

      const userIds = Array.from(
        new Set((data ?? []).map((row: any) => row.user_id).filter((id: any): id is string => typeof id === "string" && !!id))
      );
      const profileMap = new Map<string, any>();
      if (userIds.length) {
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name, username, avatar_url")
          .in("id", userIds);
        if (profilesError) throw profilesError;
        (profiles ?? []).forEach((profile: any) => {
          profileMap.set(profile.id, profile);
        });
      }

      return (data ?? []).map((row: any) => {
        const profile = profileMap.get(row.user_id);
        return {
          user_id: row.user_id,
          full_name: profile?.full_name ?? "Utilisateur",
          username: profile?.username ?? "utilisateur",
          avatar_url: profile?.avatar_url ?? null,
        };
      }) as Member[];
    },
  });

  const [showMembersList, setShowMembersList] = useState(false);
  const [showEditSheet, setShowEditSheet] = useState(false);
  const updateClub = useUpdateClub();

  // Check if user is already a member or has a pending request
  const { data: joinStatus } = useJoinRequestStatus("club", clubId ?? null);

  const joinMut = useMutation({
    mutationFn: async () => {
      if (!userId || !club) return;
      const { error } = await supabase.from("club_join_requests").insert({ club_id: club.id, user_id: userId });
      if (error) throw error;
    },
    onSuccess: () => {
      posthog.capture("club_join_requested", {
        club_id: club?.id ?? null,
        club_name: club?.name ?? null,
        club_sport: club?.sport ?? null,
        is_external: club?.is_external ?? null,
      });
      Toast.show({ type: "success", text1: "Demande envoyée au créateur" });
      void queryClient.invalidateQueries({ queryKey: ["club", clubId] });
      void queryClient.invalidateQueries({ queryKey: ["join-request-status", "club", clubId] });
    },
    onError: () => Toast.show({ type: "error", text1: "Impossible d'envoyer la demande" }),
  });

  if (!club) {
    return (
      <SafeScreen className="flex-1 items-center justify-center">
        <Text>Chargement…</Text>
      </SafeScreen>
    );
  }

  const hero = club.hero_urls?.[0] ?? club.logo_url;

  return (
    <SafeScreen className="flex-1 bg-neutral-50 dark:bg-[#0A0F1E]" edges={["top"]}>
      <Stack.Screen
        options={{
          title: club.name,
          headerRight: () => {
            if (userId && club.created_by === userId) {
              return (
                <Pressable onPress={() => setShowEditSheet(true)} hitSlop={8} className="mr-2">
                  <Ionicons name="settings-outline" size={24} color="#0F172A" />
                </Pressable>
              );
            }
            return null;
          },
        }}
      />
      <View className="flex-row items-center px-3 py-2">
        <BackButton />
        <Text className="flex-1 text-center text-lg font-semibold text-neutral-900 dark:text-neutral-50" numberOfLines={1}>
          {club.name}
        </Text>
      </View>
      <ScrollView className="flex-1 px-4">
        {/* Hero gallery */}
        {club.hero_urls.length > 0 ? (
          <FlatList
            horizontal
            data={club.hero_urls}
            keyExtractor={(u) => u}
            showsHorizontalScrollIndicator={false}
            className="mb-4"
            renderItem={({ item }) => (
              <Image source={{ uri: item }} className="w-80 h-48 rounded-xl mr-2" contentFit="cover" />
            )}
          />
        ) : hero ? (
          <Image source={{ uri: hero }} className="w-full h-48 rounded-xl mb-4" contentFit="cover" />
        ) : null}

        <View className="flex-row items-center gap-3 mb-2">
          {club.logo_url ? (
            <Image source={{ uri: club.logo_url }} style={{ width: 60, height: 60, borderRadius: 30 }} />
          ) : null}
          <View className="flex-1">
            <Text className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">{club.name}</Text>
            <View className="flex-row gap-2 mt-1">
              <Badge>{club.sport}</Badge>
              {club.is_external ? <Badge variant="warning">Source externe</Badge> : null}
            </View>
            <Text className="text-neutral-500 mt-1">
              {club.city}, {getCountryDisplay(club.country)}
            </Text>
          </View>
        </View>

        {/* Creator profile */}
        {creator ? (
          <Pressable
            className="flex-row items-center gap-3 mb-4 p-3 bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-100 dark:border-neutral-700"
            onPress={() => router.push(`/profile/${creator.id}`)}
          >
            <Avatar size={40} uri={creator.avatar_url} />
            <View className="flex-1">
              <Text className="text-sm font-medium text-neutral-900 dark:text-neutral-50">{creator.full_name}</Text>
              <Text className="text-xs text-neutral-500">@{creator.username}</Text>
            </View>
            <Text className="text-xs text-neutral-500">Créateur</Text>
          </Pressable>
        ) : null}

        <Text className="text-base text-neutral-800 dark:text-neutral-100 mt-2">{club.description}</Text>

        {/* Detailed info */}
        <View className="mt-4 p-4 bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-100 dark:border-neutral-700">
          <Text className="text-sm text-neutral-500">Adresse : {club.address ?? "—"}</Text>
          {club.founded_date ? (
            <Text className="text-sm text-neutral-500 mt-1">Fondation : {club.founded_date}</Text>
          ) : null}
          {club.league ? (
            <Text className="text-sm text-neutral-500 mt-1">Ligue/Division : {club.league}</Text>
          ) : null}
          {club.age_min != null || club.age_max != null ? (
            <Text className="text-sm text-neutral-500 mt-1">
              Tranche d'âge : {club.age_min ?? "—"} – {club.age_max ?? "—"} ans
            </Text>
          ) : null}
          {club.required_level ? (
            <Text className="text-sm text-neutral-500 mt-1">Niveau requis : {club.required_level}</Text>
          ) : null}
          {club.contact_email ? (
            <Text className="text-sm text-neutral-500 mt-1">Contact : {club.contact_email}</Text>
          ) : null}
          <Text className="text-sm text-neutral-500 mt-1">Membres : {club.member_count}</Text>
        </View>

        {/* Members strip */}
        {!club.is_external ? <ClubMembersStrip members={members} /> : null}

        {/* View all members button */}
        {!club.is_external && members.length > 0 ? (
          <Pressable
            className="mt-4 p-4 bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-100 dark:border-neutral-700 flex-row items-center justify-between"
            onPress={() => setShowMembersList(true)}
          >
            <Text className="text-base font-medium text-neutral-900 dark:text-neutral-50">
              Voir tous les membres
            </Text>
            <Ionicons name="chevron-forward" size={20} color="#0F172A" />
          </Pressable>
        ) : null}

        {!club.is_external && loadingAllMembers ? (
          <View className="mt-4 items-center py-4">
            <ActivityIndicator size="small" color="#0F172A" />
          </View>
        ) : null}

        {/* Source link */}
        {club.is_external && club.source_url ? (
          <Pressable
            className="mt-3"
            onPress={() => void WebBrowser.openBrowserAsync(club.source_url!)}
          >
            <Text className="text-primary text-sm font-medium">
              Source : {club.source_name ?? club.source_url}
            </Text>
          </Pressable>
        ) : null}

        <View className="flex-row gap-3 mt-6 mb-10">
          <Button title="Partager" variant="secondary" onPress={() => void Share.share({ message: club.name })} />
        </View>
        {club.is_external && club.registration_url ? (
          <Button title="S'inscrire" onPress={() => void WebBrowser.openBrowserAsync(club.registration_url!)} />
        ) : userId && club.created_by === userId ? null : joinStatus?.isMember ? (
          <Button title="Membre" variant="secondary" onPress={() => {}} disabled />
        ) : joinStatus?.isPending ? (
          <Button title="Demande envoyée" variant="secondary" onPress={() => {}} disabled />
        ) : (
          <Button
            title={club.is_private ? "Demander à rejoindre" : "Rejoindre le club"}
            onPress={() => joinMut.mutate()}
            loading={joinMut.isPending}
          />
        )}
        <InvitationButton
          type="club"
          targetId={club.id}
          visible={!!userId && club.created_by === userId && !!club.is_private}
          className="mt-3 mb-10"
        />
      </ScrollView>

      {/* Members List Modal */}
      <MembersListSheet
        visible={showMembersList}
        onClose={() => setShowMembersList(false)}
        members={allMembers}
        type="club"
        targetId={club.id}
        createdBy={club.created_by}
        currentUserId={userId}
      />

      {/* Edit Club Modal */}
      <EditClubEventSheet
        visible={showEditSheet}
        onClose={() => setShowEditSheet(false)}
        type="club"
        data={club}
        onSave={(updateData, oldData) => {
          updateClub.mutate({ clubId: club.id, data: updateData, oldData }, { onSuccess: () => setShowEditSheet(false) });
        }}
        isLoading={updateClub.isPending}
      />
    </SafeScreen>
  );
}
