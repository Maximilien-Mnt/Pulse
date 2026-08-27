import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { SourceBadge } from "@/components/shared/SourceBadge";
import { InvitationButton } from "@/components/shared/InvitationButton";
import { MembersListSheet, type Member } from "@/components/shared/MembersListSheet";
import { EditClubEventSheet } from "@/components/shared/EditClubEventSheet";
import { useJoinRequestStatus } from "@/hooks/useJoinRequestStatus";
import { useUpdateEvent } from "@/hooks/useUpdateEvent";
import { supabase } from "@/lib/supabase";
import type { EventRow } from "@/types";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Image } from "expo-image";
import * as WebBrowser from "expo-web-browser";
import { ScrollView, Text, View, Pressable, Share, ActivityIndicator } from "react-native";
import { SafeScreen } from "@/components/shared/SafeScreen";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import { useAuthStore } from "@/stores/authStore";
import { formatDateLong } from "@/utils/date";
import { formatPriceFromCents } from "@/utils/format";
import { usePostHog } from "posthog-react-native";
import { queryClient } from "@/lib/queryClient";
import { getCountryDisplay } from "@/utils/countries";
import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { BackButton } from "@/components/ui/BackButton";

export default function EventDetailScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const router = useRouter();
  const posthog = usePostHog();
  const userId = useAuthStore((s) => s.userId);

  const { data: event } = useQuery({
    queryKey: ["event", eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return data as EventRow;
    },
  });

  const { data: eventCreator } = useQuery({
    queryKey: ["event-creator", event?.created_by],
    enabled: !!event?.created_by,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url")
        .eq("id", event!.created_by as string)
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

  // Check if user is already a participant or has a pending request
  const { data: joinStatus } = useJoinRequestStatus("event", eventId ?? null);

  // Fetch all participants for the full list (no limit)
  const { data: allParticipants = [], isLoading: loadingAllParticipants } = useQuery({
    queryKey: ["event-all-participants", eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_participants")
        .select("user_id")
        .eq("event_id", eventId!);

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
  const updateEvent = useUpdateEvent();

  // An event is full when it has a limited number of places and all are taken
  const isFull = event?.places_total != null && (event?.accepted_count ?? 0) >= event.places_total;

  const joinMut = useMutation({
    mutationFn: async () => {
      if (!userId || !event || isFull) return;
      const { error } = await supabase.from("event_join_requests").insert({ event_id: event.id, user_id: userId });
      if (error) throw error;
    },
    onSuccess: () => {
      posthog.capture("event_join_requested", {
        event_id: event?.id ?? null,
        event_name: event?.name ?? null,
        event_sport: event?.sport ?? null,
        is_paid: event?.is_paid ?? null,
        is_external: event?.is_external ?? null,
      });
      Toast.show({ type: "success", text1: "Demande envoyée" });
      void queryClient.invalidateQueries({ queryKey: ["join-request-status", "event", eventId] });
    },
    onError: () => Toast.show({ type: "error", text1: "Erreur" }),
  });

  if (!event) {
    return (
      <SafeScreen className="flex-1 items-center justify-center">
        <Text>Chargement…</Text>
      </SafeScreen>
    );
  }

  const hero = event.hero_urls?.[0] ?? event.logo_url;

  return (
    <SafeScreen className="flex-1 bg-neutral-50 dark:bg-[#0A0F1E]" edges={["top"]}>
      <Stack.Screen
        options={{
          title: event.name,
          headerRight: () => {
            if (userId && event.created_by === userId) {
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
        <Text className="flex-1 text-center text-lg font-semibold" numberOfLines={1}>
          {event.name}
        </Text>
      </View>
      <ScrollView className="px-4 pb-8">
        {hero ? <Image source={{ uri: hero }} className="w-full h-48 rounded-xl mb-4" contentFit="cover" /> : null}
        <Text className="text-2xl font-bold">{event.name}</Text>
        <View className="flex-row gap-2 mt-2">
          <Badge>{event.sport}</Badge>
          <SourceBadge isExternal={event.is_external} />
        </View>
        {/* Creator profile */}
        {eventCreator ? (
          <Pressable
            className="flex-row items-center gap-3 mb-4 p-3 bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-100 dark:border-neutral-700"
            onPress={() => router.push(`/profile/${eventCreator.id}`)}
          >
            <Avatar size={40} uri={eventCreator.avatar_url} />
            <View className="flex-1">
              <Text className="text-sm font-medium text-neutral-900 dark:text-neutral-50">{eventCreator.full_name}</Text>
              <Text className="text-xs text-neutral-500">@{eventCreator.username}</Text>
            </View>
            <Text className="text-xs text-neutral-500">Créateur</Text>
          </Pressable>
        ) : null}

        <Text className="mt-2 text-neutral-600 dark:text-neutral-300">{formatDateLong(event.start_date)}</Text>
        {event.end_date ? (
          <Text className="text-neutral-600">Fin : {formatDateLong(event.end_date)}</Text>
        ) : null}
        <Text className="text-neutral-600">{event.city}, {getCountryDisplay(event.country)}</Text>
        {event.venue_address ? (
          <Text className="text-neutral-600">Lieu : {event.venue_address}</Text>
        ) : null}
        <Text className="mt-3 text-base">{event.description}</Text>
        <Text className="mt-2 font-semibold text-primary">{formatPriceFromCents(event.price_cents, event.is_paid)}</Text>
        {event.places_total != null ? (
          <Text className="text-sm text-neutral-500 mt-1">Places : {event.accepted_count ?? 0} / {event.places_total}</Text>
        ) : null}
        {event.club_id ? (
          <Pressable
            className="mt-2"
            onPress={() => router.push(`/(tabs)/clubs/${event.club_id}`)}
          >
            <Text className="text-primary text-sm font-medium">Club organisateur →</Text>
          </Pressable>
        ) : null}

        {/* View all participants button */}
        {(event.accepted_count ?? 0) > 0 ? (
          <Pressable
            className="mt-4 p-4 bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-100 dark:border-neutral-700 flex-row items-center justify-between"
            onPress={() => setShowMembersList(true)}
          >
            <Text className="text-base font-medium text-neutral-900 dark:text-neutral-50">
              Voir tous les participants
            </Text>
            <Ionicons name="chevron-forward" size={20} color="#0F172A" />
          </Pressable>
        ) : null}

        {loadingAllParticipants ? (
          <View className="mt-4 items-center py-4">
            <ActivityIndicator size="small" color="#0F172A" />
          </View>
        ) : null}
        <View className="flex-row gap-3 mt-6">
          <Button title="Partager" variant="secondary" onPress={() => void Share.share({ message: event.name })} />
        </View>
        {event.is_external && event.registration_url ? (
          <Button title="S'inscrire" onPress={() => void WebBrowser.openBrowserAsync(event.registration_url!)} />
        ) : userId && event.created_by === userId ? null : joinStatus?.isMember ? (
          <Button title="Participant" variant="secondary" onPress={() => {}} disabled />
        ) : joinStatus?.isPending ? (
          <Button title="Demande envoyée" variant="secondary" onPress={() => {}} disabled />
        ) : isFull ? (
          <Button title="Complet" variant="secondary" onPress={() => {}} disabled />
        ) : (
          <Button
            title={event.is_private ? "Demander à participer" : "Participer"}
            onPress={() => joinMut.mutate()}
            loading={joinMut.isPending}
          />
        )}
        {isFull ? (
          <Text className="mt-2 text-sm text-error text-center">
            Plus de places disponibles pour cet événement.
          </Text>
        ) : null}
        <InvitationButton
          type="event"
          targetId={event.id}
          visible={!!userId && event.created_by === userId && !!event.is_private}
          className="mt-3 mb-10"
        />
      </ScrollView>

      {/* Participants List Modal */}
      <MembersListSheet
        visible={showMembersList}
        onClose={() => setShowMembersList(false)}
        members={allParticipants}
        type="event"
        targetId={event.id}
        createdBy={event.created_by}
        currentUserId={userId}
      />

      {/* Edit Event Modal */}
      <EditClubEventSheet
        visible={showEditSheet}
        onClose={() => setShowEditSheet(false)}
        type="event"
        data={event}
        onSave={(updateData, oldData) => {
          updateEvent.mutate({ eventId: event.id, data: updateData, oldData }, { onSuccess: () => setShowEditSheet(false) });
        }}
        isLoading={updateEvent.isPending}
      />
    </SafeScreen>
  );
}
