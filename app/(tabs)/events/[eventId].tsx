import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { FlatList, RefreshControl, ScrollView, View, Pressable, Share } from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { SafeScreen } from "@/components/shared/SafeScreen";
import Toast from "react-native-toast-message";
import { useAuthStore } from "@/stores/authStore";
import { usePostHog } from "posthog-react-native";
import { getCountryDisplay } from "@/utils/countries";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { SourceBadge } from "@/components/shared/SourceBadge";
import { InvitationButton } from "@/components/shared/InvitationButton";
import { ShareButton } from "@/components/shared/ShareButton";
import { FavoriteButton } from "@/components/feed/LikeButton";
import { useToggleFavorite } from "@/hooks/useToggleFavorite";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Icon } from "@/components/ui/Icon";
import { Text as PulseText } from "@/components/ui/Text";
import { Avatar } from "@/components/ui/Avatar";
import { BackButton } from "@/components/ui/BackButton";
import { MembersListSheet, type Member } from "@/components/shared/MembersListSheet";
import { EditClubEventSheet } from "@/components/shared/EditClubEventSheet";
import { useJoinRequestStatus } from "@/hooks/useJoinRequestStatus";
import { useUpdateEvent } from "@/hooks/useUpdateEvent";
import { EventMembersStrip } from "@/components/events/EventMembersStrip";
import { attachEventCreators } from "@/lib/eventIdentity";
import { supabase } from "@/lib/supabase";
import type { EventRow } from "@/types";
import { formatDateLong, formatTime } from "@/utils/date";
import { formatPriceFromCents } from "@/utils/format";
import { SPORTS } from "@/lib/constants";
import { useTranslation , t } from "@/hooks/useTranslation";
import { isNetworkError } from "@/utils/isNetworkError";
import { logQueryError } from "@/utils/logQueryError";

export default function EventDetailScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const router = useRouter();
  const posthog = usePostHog();
  const { t } = useTranslation();
  const userId = useAuthStore((s) => s.userId);
  const queryClient = useQueryClient();

  const {
    data: event,
    isLoading: eventLoading,
    isFetching: eventFetching,
    isError: eventIsError,
    error: eventError,
    refetch: refetchEvent,
  } = useQuery({
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
    queryKey: ["event-creator", eventId, event?.created_by, event?.publisher_club_id, userId],
    enabled: !!event,
    queryFn: async () => {
      const [resolved] = await attachEventCreators([event!]);
      return resolved?.creator ?? null;
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
          full_name: profile?.full_name ?? t("events.fallbackUserName"),
          username: profile?.username ?? t("events.fallbackUsername"),
          avatar_url: profile?.avatar_url ?? null,
        };
      }) as Member[];
    },
  });

  const [showMembersList, setShowMembersList] = useState(false);
  const [showEditSheet, setShowEditSheet] = useState(false);
  const updateEvent = useUpdateEvent();

  // Safe, PII-free diagnostics for detail load failures (UI stays non-technical).
  useEffect(() => {
    if (eventIsError) logQueryError("event-detail", eventError);
  }, [eventIsError, eventError]);

  const eventOffline = eventIsError && isNetworkError(eventError);

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

  const { isFavorited, favCount, isPending, toggle } = useToggleFavorite({
    entityType: "event",
    id: eventId ?? "",
    extraInvalidationKeys: [["event", eventId]],
  });

  const handleToggleFavorite = () => toggle;

  if (!event) {
    if (eventLoading) {
      return (
        <SafeScreen className="flex-1 bg-neutral-50 dark:bg-[#0A0F1E]">
          <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
            <View className="px-4 pt-4 gap-3" testID="event-detail-skeleton" accessibilityLabel={t("common.loading")}>
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

    // Load failure with nothing to show: localized message + retry (no raw error).
    if (eventIsError) {
      return (
        <SafeScreen className="flex-1 bg-neutral-50 dark:bg-[#0A0F1E]">
          <ErrorState
            testID="event-detail-error"
            title={t("events.list.loadErrorTitle")}
            message={eventOffline ? t("events.detail.offlineBody") : t("events.detail.loadErrorBody")}
            onRetry={() => void refetchEvent()}
          />
          <Button title={t("common.back")} variant="secondary" className="mx-6" onPress={() => router.back()} />
        </SafeScreen>
      );
    }

    return (
      <SafeScreen className="flex-1 items-center justify-center bg-neutral-50 dark:bg-[#0A0F1E]">
        <EmptyState
          testID="event-detail-not-found"
          icon="Calendar"
          title={t("events.notFound")}
          subtitle={t("events.detail.notFoundHint")}
          ctaLabel={t("common.back")}
          onCta={() => router.back()}
        />
      </SafeScreen>
    );
  }

  const coverImage = event.cover_url ?? event.hero_urls?.[0] ?? event.logo_url;
  // When no dedicated cover exists the first photo doubles as the cover, so the
  // gallery only shows the remaining photos.
  const galleryUrls = event.cover_url ? (event.hero_urls ?? []) : (event.hero_urls ?? []).slice(1);
  const levelMap = (event.required_levels as Record<string, string> | null) ?? {};
  const perSportLevels = (event.sports?.length ? event.sports : event.sport ? [event.sport] : [])
    .map((id) => ({ id, label: SPORTS.find((s) => s.id === id)?.label ?? id, level: levelMap[id] }))
    .filter((entry): entry is { id: string; label: string; level: string } => !!entry.level);
  const placeParts = [event.venue_address, event.postal_code, event.city, getCountryDisplay(event.country)].filter(
    (part): part is string => !!part && part.trim().length > 0
  );
  const placeValue = placeParts.join(", ");
  const isCreator = !!userId && event.created_by === userId;

  const registrationUrl = event.registration_url?.trim() || null;
  const shortDescription = event.short_description?.trim() || null;
  const longDescription = event.description?.trim() || null;

  let actionButton: React.ReactNode = null;
  if (registrationUrl) {
    actionButton = (
      <Button
        title={t("events.register")}
        icon="Globe"
        onPress={async () => {
          const { openBrowserAsync } = await import("expo-web-browser");
          if (event.registration_url) await openBrowserAsync(event.registration_url);
        }}
      />
    );
  } else if (!isCreator) {
    if (joinStatus?.isMember) actionButton = <Button title={t("events.participant")} variant="secondary" disabled />;
    else if (joinStatus?.isPending) actionButton = <Button title={t("events.requestSent")} variant="secondary" disabled />;
    else if (isFull) actionButton = <Button title={t("events.full")} variant="secondary" disabled />;
    else {
      actionButton = (
        <Button
          testID="event-detail-join-button"
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
      ? `${event.accepted_count ?? 0} / ${event.places_total}${isFull ? t("events.spotsFullSuffix") : ""}`
      : t("events.spotsRegistered", { count: event.accepted_count ?? 0 });

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

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        testID="event-detail-content"
        refreshControl={
          <RefreshControl
            refreshing={eventFetching && !eventLoading}
            onRefresh={() => void refetchEvent()}
            testID="event-detail-refreshing"
          />
        }
      >
        {/* Cover image + photo gallery */}
        <View className="px-4">
          {coverImage ? (
            <Image source={{ uri: coverImage }} className="w-full h-48 rounded-2xl mb-4" contentFit="cover" />
          ) : (
            <View className="w-full h-36 rounded-2xl mb-4 bg-neutral-200 dark:bg-neutral-700 items-center justify-center">
              <Icon name="Trophy" size={32} color="text-tertiary" />
            </View>
          )}
          {galleryUrls.length > 0 ? (
            <FlatList
              horizontal
              data={galleryUrls}
              keyExtractor={(u) => u}
              showsHorizontalScrollIndicator={false}
              className="py-2 mb-2"
              renderItem={({ item }) => (
                <Image source={{ uri: item }} className="w-[320px] h-[200px] rounded-2xl mr-3" contentFit="cover" />
              )}
            />
          ) : null}
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
              {shortDescription ? (
                <PulseText variant="body" numberOfLines={2} className="text-neutral-600 dark:text-neutral-300 mt-1.5">
                  {shortDescription}
                </PulseText>
              ) : null}

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
                  {formatPriceFromCents(event.price_cents, event.is_paid, t("events.priceFree"))}
                </PulseText>
              </View>

              {/* Favorites */}
              <View className="flex-row items-center gap-1.5 mt-3">
                <FavoriteButton
                  isFavorite={!!isFavorited}
                  count={favCount ?? 0}
                  isPending={isPending}
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
              onPress={() => router.push(eventCreator.kind === "club" ? `/(tabs)/clubs/${eventCreator.id}` : `/profile/${eventCreator.id}`)}
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
                  {eventCreator.kind === "club" ? t("create.event.clubAccount") : `@${eventCreator.username}`}
                </PulseText>
              </View>
              <View className="px-2.5 py-1 rounded-full bg-primary/10">
                <PulseText variant="overline" className="text-primary">
                  {t("members.creator")}
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
        {longDescription ? (
          <View className="mx-4 mb-5">
            <PulseText variant="overline" className="text-neutral-400 mb-2">
              Description
            </PulseText>
            <View className="p-4 bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-100 dark:border-neutral-700">
              <PulseText variant="body" className="text-neutral-800 dark:text-neutral-100 leading-relaxed">
                {longDescription}
              </PulseText>
            </View>
          </View>
        ) : null}

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
            value={placeValue || `${event.city}, ${getCountryDisplay(event.country)}`}
          />
          <InfoRow icon="Users" label="Places" value={placesLabel} />
          {perSportLevels.length > 0 ? (
            <InfoRow
              icon="Shield"
              label={t("events.requiredLevel")}
              value={perSportLevels.map((entry) => `${entry.label} — ${entry.level}`).join(" · ")}
            />
          ) : event.required_level ? (
            <InfoRow icon="Shield" label={t("events.requiredLevel")} value={event.required_level} />
          ) : null}
          {event.league ? <InfoRow icon="Trophy" label={t("forms.league")} value={event.league} /> : null}
          {event.contact_email ? <InfoRow icon="Mail" label={t("create.event.contactEmailShort")} value={event.contact_email} /> : null}
          {event.category ? <InfoRow icon="Tag" label={t("events.category")} value={event.category} /> : null}
          {event.difficulty ? <InfoRow icon="Star" label={t("events.difficulty")} value={`${event.difficulty}/5`} /> : null}
          {event.website_url ? <InfoRow icon="Globe" label={t("forms.website")} value={event.website_url} /> : null}
          {registrationUrl ? <InfoRow icon="ExternalLink" label={t("create.event.registrationLink")} value={registrationUrl} /> : null}
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
          <View
            className="mx-4 mb-5 items-center py-3"
            testID="event-detail-participants-loading"
            accessible
            accessibilityLabel={t("common.loading")}
          >
            <LoadingSpinner size="small" />
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

