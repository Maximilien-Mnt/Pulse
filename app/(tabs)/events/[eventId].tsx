import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Image } from "expo-image";
import * as WebBrowser from "expo-web-browser";
import { FlatList, ScrollView, View, Pressable, Share, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { SafeScreen } from "@/components/shared/SafeScreen";
import Toast from "react-native-toast-message";
import { useAuthStore } from "@/stores/authStore";
import { queryClient } from "@/lib/queryClient";
import { usePostHog } from "posthog-react-native";
import { getCountryDisplay } from "@/utils/countries";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { SourceBadge } from "@/components/shared/SourceBadge";
import { InvitationButton } from "@/components/shared/InvitationButton";
import { ShareButton } from "@/components/shared/ShareButton";
import { FavoriteButton } from "@/components/feed/LikeButton";
import { Skeleton } from "@/components/ui/Skeleton";
import { Icon } from "@/components/ui/Icon";
import { Text as PulseText } from "@/components/ui/Text";
import { Avatar } from "@/components/ui/Avatar";
import { BackButton } from "@/components/ui/BackButton";
import { MembersListSheet, type Member } from "@/components/shared/MembersListSheet";
import { EditClubEventSheet } from "@/components/shared/EditClubEventSheet";
import { useJoinRequestStatus } from "@/hooks/useJoinRequestStatus";
import { useUpdateEvent } from "@/hooks/useUpdateEvent";
import { EventMembersStrip } from "@/components/events/EventMembersStrip";
import { supabase } from "@/lib/supabase";
import type { EventRow } from "@/types";
import { formatDateLong, formatTime } from "@/utils/date";
import { formatPriceFromCents } from "@/utils/format";
import { useTranslation , t } from "@/hooks/useTranslation";

export default function EventDetailScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const router = useRouter();
  const posthog = usePostHog();
  const { t } = useTranslation();
  const userId = useAuthStore((s) => s.userId);

  const { data: event, isLoading: eventLoading } = useQuery({
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
        full_name: data.full_name ?? t("common.userNotFound"),
        username: data.username ?? "user",
        avatar_url: data.avatar_url ?? null,
      };
    },
  });

  // Organising club name (shown in the t("common.details") section; keeps the existing nav)
  const { data: organisingClub } = useQuery({
    queryKey: ["event-organising-club", event?.club_id],
    enabled: !!event?.club_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clubs")
        .select("id, name")
        .eq("id", event!.club_id as string)
        .maybeSingle();
      if (error) throw error;
      return (data as { id: string; name: string } | null)?.name;
    },
  });

  // Check if user is already a participant or has a pending request
  const { data: joinStatus } = useJoinRequestStatus("event", eventId ?? null);

  // Fetch all participants for the full list and the avatar stack (no limit)
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
      Toast.show({ type: "success", text1: t("events.requestSent") });
      void queryClient.invalidateQueries({ queryKey: ["join-request-status", "event", eventId] });
    },
    onError: () => Toast.show({ type: "error", text1: t("common.error") }),
  });

  // ── Favorites (like) ───────────────────────────────────────────────
  const { data: isFavorited } = useQuery({
    queryKey: ["event-favorite", eventId],
    enabled: !!userId && !!eventId,
    queryFn: async () => {
      const { data: favData, error } = await supabase
        .from("event_favorites")
        .select("event_id")
        .eq("user_id", userId!)
        .eq("event_id", eventId!)
        .maybeSingle();
      if (error) throw error;
      return !!favData;
    },
  });

  const { data: favoritesCount = 0 } = useQuery({
    queryKey: ["event-favorites-count", eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("event_favorites")
        .select("*", { count: "exact", head: true })
        .eq("event_id", eventId!);
      if (error) throw error;
      return count ?? 0;
    },
    staleTime: 5000,
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: async () => {
      if (!userId || !eventId) return;
      if (isFavorited) {
        await supabase.from("event_favorites").delete().eq("user_id", userId).eq("event_id", eventId);
      } else {
        await supabase.from("event_favorites").insert({ user_id: userId, event_id: eventId });
      }
    },
    onMutate: async () => {
      const prevIsFav = queryClient.getQueryData(["event-favorite", eventId]);
      const prevCount = queryClient.getQueryData(["event-favorites-count", eventId]) as number | undefined;
      queryClient.setQueryData(["event-favorite", eventId], true);
      queryClient.setQueryData(["event-favorites-count", eventId], (prevCount ?? 0) + 1);
      return { prevIsFav, prevCount };
    },
    onError: (_err, _vars, context) => {
      if (context?.prevIsFav !== undefined) {
        queryClient.setQueryData(["event-favorite", eventId], context.prevIsFav);
      }
      if (context?.prevCount !== undefined) {
        queryClient.setQueryData(["event-favorites-count", eventId], context.prevCount);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["event-favorite", eventId] });
      void queryClient.invalidateQueries({ queryKey: ["event-favorites-count", eventId] });
      void queryClient.invalidateQueries({ queryKey: ["events"] });
      void queryClient.invalidateQueries({ queryKey: ["event", eventId] });
    },
  });

  const handleToggleFavorite = () => {
    void toggleFavoriteMutation.mutate();
  };

  if (!event) {
    if (eventLoading) {
      return (
        <SafeScreen className="flex-1 bg-neutral-50 dark:bg-[#0A0F1E]">
          <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
            <View className="px-4 pt-4 gap-3">
              <Skeleton className="w-full h-48 rounded-2xl" />
              <View className="flex-row items-center gap-3">
                <Skeleton className="w-[72px] h-[72px] rounded-3xl" />
                <View className="flex-1 gap-2">
                  <Skeleton className="w-3/4 h-7 rounded-lg" />
                  <Skeleton className="w-1/2 h-4 rounded-md" />
                </View>
              </View>
              <Skeleton className="w-full h-24 rounded-2xl" />
              <Skeleton className="w-full h-32 rounded-2xl" />
              <Skeleton className="w-full h-12 rounded-xl" />
            </View>
          </ScrollView>
        </SafeScreen>
      );
    }

    return (
      <SafeScreen className="flex-1 items-center justify-center bg-neutral-50 dark:bg-[#0A0F1E]">
        <Icon name="AlertCircle" size={32} color="text-tertiary" />
        <PulseText variant="body" className="mt-3 text-neutral-500">
          {t("events.notFound")}
        </PulseText>
        <Button title={t("common.back")} variant="secondary" className="mt-4" onPress={() => router.back()} />
      </SafeScreen>
    );
  }

  const hero = event.hero_urls?.[0] ?? event.logo_url;
  const isCreator = !!userId && event.created_by === userId;

  const isExternalReg = !!event.is_external && !!event.registration_url;

  let actionButton: React.ReactNode = null;
  if (isExternalReg) {
    actionButton = (
      <Button
        title={t("events.register")}
        icon="Globe"
        onPress={() => void WebBrowser.openBrowserAsync(event.registration_url!)}
      />
    );
  } else if (!isCreator) {
    if (joinStatus?.isMember) actionButton = <Button title={t("events.participant")} variant="secondary" disabled />;
    else if (joinStatus?.isPending) actionButton = <Button title={t("events.requestSent")} variant="secondary" disabled />;
    else if (isFull) actionButton = <Button title={t("events.full")} variant="secondary" disabled />;
    else {
      actionButton = (
        <Button
          title={event.is_private ? t("events.requestJoin") : t("events.join")}
          icon="CheckCircle2"
          onPress={() => joinMut.mutate()}
          loading={joinMut.isPending}
        />
      );
    }
  }
  const actionVisible = actionButton !== null;

  const placesLabel =
    event.places_total != null
      ? `${event.accepted_count ?? 0} / ${event.places_total}${isFull ? " — Complet" : ""}`
      : `${event.accepted_count ?? 0} inscrit${(event.accepted_count ?? 0) > 1 ? "s" : ""}`;

  return (
    <SafeScreen className="flex-1 bg-neutral-50 dark:bg-[#0A0F1E]" edges={["top"]}>
      <Stack.Screen
        options={{
          title: event.name,
          headerRight: () =>
            isCreator ? (
              <Pressable onPress={() => setShowEditSheet(true)} hitSlop={8} className="mr-2">
                <Icon name="Settings" size={24} color="text-secondary" />
              </Pressable>
            ) : null,
        }}
      />

      <View className="flex-row items-center px-3 py-2">
        <BackButton useInAppSession />
        <PulseText variant="h2" className="flex-1 text-center" numberOfLines={1}>
          {event.name}
        </PulseText>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Hero gallery */}
        <View className="px-4">
          {event.hero_urls && event.hero_urls.length > 0 ? (
            <FlatList
              horizontal
              data={event.hero_urls}
              keyExtractor={(u) => u}
              showsHorizontalScrollIndicator={false}
              className="py-2 mb-2"
              renderItem={({ item }) => (
                <Image source={{ uri: item }} className="w-[320px] h-[200px] rounded-2xl mr-3" contentFit="cover" />
              )}
            />
          ) : hero ? (
            <Image source={{ uri: hero }} className="w-full h-48 rounded-2xl mb-4" contentFit="cover" />
          ) : (
            <View className="w-full h-36 rounded-2xl mb-4 bg-neutral-200 dark:bg-neutral-700 items-center justify-center">
              <Icon name="Trophy" size={32} color="text-tertiary" />
            </View>
          )}
        </View>

        {/* Title + quick info */}
        <View className="px-5 mb-6">
          <View className="flex-row items-start gap-4">
            {event.logo_url ? (
              <Image
                source={{ uri: event.logo_url }}
                className="w-[72px] h-[72px] rounded-3xl bg-neutral-100 dark:bg-neutral-700"
                contentFit="cover"
              />
            ) : (
              <View className="w-[72px] h-[72px] rounded-3xl bg-neutral-200 dark:bg-neutral-700 items-center justify-center">
                <Icon name="Trophy" size={24} color="text-tertiary" />
              </View>
            )}

            <View className="flex-1 pt-0.5">
              <PulseText variant="h1" numberOfLines={2}>
                {event.name}
              </PulseText>

              <View className="flex-row flex-wrap gap-2 mt-3 items-center">
                <Badge>{event.sport}</Badge>
                {event.category ? <Badge variant="neutral">{event.category}</Badge> : null}
                <SourceBadge isExternal={event.is_external} />
              </View>

              <View className="flex-row items-center gap-1.5 mt-2">
                <Icon name="MapPinned" size={16} color="text-secondary" />
                <PulseText variant="caption" className="text-neutral-500">
                  {event.city}, {getCountryDisplay(event.country)}
                </PulseText>
              </View>

              <View className="flex-row items-center gap-1.5 mt-1.5">
                <Icon name="Calendar" size={16} color="text-secondary" />
                <PulseText variant="caption" className="text-neutral-500">
                  {formatDateLong(event.start_date)} · {formatTime(event.start_date)}
                  {event.end_date ? ` → ${formatDateLong(event.end_date)}` : ""}
                </PulseText>
              </View>

              <View className="flex-row items-center gap-1.5 mt-3">
                <PulseText variant="overline" className="text-neutral-400">
                  Prix
                </PulseText>
                <PulseText variant="subtitle" numberOfLines={1} className="text-primary">
                  {formatPriceFromCents(event.price_cents, event.is_paid)}
                </PulseText>
              </View>

              {/* Favorites */}
              <View className="flex-row items-center gap-1.5 mt-3">
                <FavoriteButton
                  isFavorite={!!isFavorited}
                  count={favoritesCount}
                  isPending={toggleFavoriteMutation.isPending}
                  onPress={handleToggleFavorite}
                  size={16}
                />
                <ShareButton content={{ title: event.name, message: `${event.name} — Pulse`, url: `https://pulse.app/event/${event.id}` }} iconSize={16} />
              </View>
            </View>
          </View>
        </View>

        {/* Organizer */}
        {event.created_by ? (
          eventCreator ? (
            <Pressable
              onPress={() => router.push(`/profile/${eventCreator.id}`)}
              className="flex-row items-center gap-3 p-4 bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-100 dark:border-neutral-700 active:opacity-90"
            >
              <Avatar size={48} uri={eventCreator.avatar_url} />
              <View className="flex-1">
                <PulseText
                  variant="body"
                  className="font-semibold text-neutral-900 dark:text-neutral-50"
                  numberOfLines={1}
                >
                  {eventCreator.full_name}
                </PulseText>
                <PulseText variant="caption" className="text-neutral-500" numberOfLines={1}>
                  @{eventCreator.username}
                </PulseText>
              </View>
              <View className="px-2.5 py-1 rounded-full bg-primary/10">
                <PulseText variant="overline" className="text-primary">
                  t("members.creator")
                </PulseText>
              </View>
            </Pressable>
          ) : (
            <View className="p-4 bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-100 dark:border-neutral-700">
              <View className="flex-row items-center gap-3">
                <Skeleton className="w-12 h-12 rounded-full" />
                <View className="flex-1 gap-2">
                  <Skeleton className="w-3/4 h-5 rounded-lg" />
                  <Skeleton className="w-1/2 h-4 rounded-md" />
                </View>
              </View>
            </View>
          )
        ) : null}

        {/* Description */}
        <View className="mx-4 mb-5">
          <PulseText variant="overline" className="text-neutral-400 mb-2">
            Description
          </PulseText>
          <View className="p-4 bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-100 dark:border-neutral-700">
            <PulseText variant="body" className="text-neutral-800 dark:text-neutral-100 leading-relaxed">
              {event.description}
            </PulseText>
          </View>
        </View>

        {/* Details */}
        <InfoSection title={t("common.details")} className="mx-4 mb-5">
          <InfoRow
            icon="Calendar"
            label="Date"
            value={`${t("events.dateTimeStart", { date: formatDateLong(event.start_date), time: formatTime(event.start_date) })}`}
          />
          {event.end_date ? (
            <InfoRow
              icon="Calendar"
              label="Fin"
              value={`${t("events.dateTimeEnd", { date: formatDateLong(event.end_date), time: formatTime(event.end_date) })}`}
            />
          ) : null}
          <InfoRow
            icon="MapPinned"
            label="Lieu"
            value={event.venue_address ?? `${event.city}, ${getCountryDisplay(event.country)}`}
          />
          <InfoRow icon="Users" label="Places" value={placesLabel} />
          {event.required_level ? <InfoRow icon="Shield" label="Niveau requis" value={event.required_level} /> : null}
          {(event.age_min != null || event.age_max != null) && (
            <InfoRow
              icon="Users"
              label={t("common.ageRange")}
              value={`${event.age_min ?? "—"} – ${event.age_max ?? "—"} ans`}
            />
          )}
          {event.club_id ? (
            <Pressable onPress={() => router.push(`/(tabs)/clubs/${event.club_id}`)}>
              <InfoRow icon="Trophy" label={t("common.organizingClub")} value={organisingClub ?? t("common.viewClub")} />
            </Pressable>
          ) : null}
        </InfoSection>

        {/* Participants */}
        {(event.accepted_count ?? 0) > 0 ? (
          <View className="mx-4 mb-5">
            <PulseText variant="overline" className="text-neutral-400 mb-2">
              {t("events.participants")} ({event.accepted_count ?? 0})
            </PulseText>
            <EventMembersStrip
              participants={allParticipants}
              count={event.accepted_count}
              onSeeAll={() => setShowMembersList(true)}
            />
          </View>
        ) : null}

        {loadingAllParticipants ? (
          <View className="mx-4 mb-5 items-center py-3">
            <ActivityIndicator size="small" color="#0F172A" />
          </View>
        ) : null}

        {/* Actions */}
        <View className="mx-4 mb-10 gap-2.5">
          <View className="flex-row gap-3">
            <View className="flex-1">
              <ShareButton content={{ title: event.name, message: `${event.name} — Pulse`, url: `https://pulse.app/event/${event.id}` }} />
            </View>
            {actionVisible ? <View className="flex-1">{actionButton}</View> : null}
          </View>

          {isFull ? (
            <PulseText variant="caption" className="mt-1 text-center text-error">
              {t("events.placesLeft")}
            </PulseText>
          ) : null}

          <InvitationButton
            type="event"
            targetId={event.id}
            visible={isCreator && !!event.is_private}
            className="mt-1"
          />
        </View>
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

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View className="flex-row items-start gap-3 py-3 border-b border-neutral-100 dark:border-neutral-800 last:border-b-0">
      <View className="pt-0.5">
        <Icon name={icon as any} size={20} color="text-secondary" />
      </View>
      <View className="flex-1 gap-0.5">
        <PulseText variant="overline" className="text-neutral-400">
          {label}
        </PulseText>
        <PulseText variant="body" className="text-neutral-800 dark:text-neutral-100">
          {value}
        </PulseText>
      </View>
    </View>
  );
}

function InfoSection({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <View className={className}>
      <PulseText variant="overline" className="text-neutral-400 mb-3">
        {title}
      </PulseText>
      <View className="p-4 bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-100 dark:border-neutral-700">
        {children}
      </View>
    </View>
  );
}

