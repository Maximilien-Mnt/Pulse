import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { RefreshControl, ScrollView, View, Share, Platform, useWindowDimensions } from "react-native";
import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { SafeScreen } from "@/components/shared/SafeScreen";
import Toast from "react-native-toast-message";
import { useAuthStore } from "@/stores/authStore";
import { usePostHog } from "posthog-react-native";
import { getCountryDisplay } from "@/utils/countries";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { MembersListSheet, type Member } from "@/components/shared/MembersListSheet";
import { useJoinRequestStatus } from "@/hooks/useJoinRequestStatus";
import { useCanManageEvent } from "@/hooks/useCanManageEvent";
import { attachEventCreators } from "@/lib/eventIdentity";
import type { EventCreator } from "@/lib/eventIdentity";
import { supabase } from "@/lib/supabase";
import type { EventRow } from "@/types";
import { formatPriceFromCents } from "@/utils/format";
import { SPORTS } from "@/lib/constants";
import { useToggleFavorite } from "@/hooks/useToggleFavorite";
import { buildSportLevelRows, practicedSports } from "@/lib/sportLevels";
import { useTranslation } from "@/hooks/useTranslation";
import { isNetworkError } from "@/utils/isNetworkError";
import { logQueryError } from "@/utils/logQueryError";
import { EventActionHeader } from "@/components/events/public/EventActionHeader";
import { EventHeroBar } from "@/components/events/public/EventHeroBar";
import { EventIdentity } from "@/components/events/public/EventIdentity";
import { EventStatTiles, type StatData } from "@/components/events/public/EventStatTiles";
import { EventDescriptionCard } from "@/components/events/public/EventDescriptionCard";
import { EventOrganizerCard } from "@/components/events/public/EventOrganizerCard";
import { EventInfoGrid, type LevelRow } from "@/components/events/public/EventInfoGrid";
import { EventParticipantsSection } from "@/components/events/public/EventParticipantsSection";
import { EventContactLinks, type LinkRowData } from "@/components/events/public/EventContactLinks";
import { EventPhotoGallery } from "@/components/events/public/EventPhotoGallery";
import { EventActionsBar } from "@/components/events/public/EventActionsBar";
import { EventLoadingSkeleton } from "@/components/events/public/EventLoadingSkeleton";

export default function EventDetailScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const router = useRouter();
  const posthog = usePostHog();
  const { t } = useTranslation();
  const userId = useAuthStore((s) => s.userId);
  const queryClient = useQueryClient();
  const { width: winWidth } = useWindowDimensions();


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

  const { data: eventCreator, isLoading: creatorLoading } = useQuery({
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

  // The event creator and the owner/admins of the club it was published
  // through can manage it (settings screen: edit + cancel).
  const { canManage } = useCanManageEvent(event ?? null);

  // Safe, PII-free diagnostics for detail load failures (UI stays non-technical).
  useEffect(() => {
    if (eventIsError) logQueryError("event-detail", eventError);
  }, [eventIsError, eventError]);

  const eventOffline = eventIsError && isNetworkError(eventError);

  // An event is full when it has a limited number of places and all are taken
  const isFull = event?.places_total != null && (event?.accepted_count ?? 0) >= event.places_total;

  const isExternal = !!event?.is_external || !!event?.registration_url?.trim();

  const joinMut = useMutation({
    mutationFn: async () => {
      if (!userId || !event || isFull) return;
      const { error } = await supabase.from("event_join_requests").insert({ event_id: event.id, user_id: userId });
      if (error) throw error;
    },
    onSuccess: async () => {
      posthog.capture("event_join_requested", {
        event_id: event?.id ?? null,
        event_name: event?.name ?? null,
        event_sport: event?.sport ?? null,
        is_paid: event?.is_paid ?? null,
        is_external: event?.is_external ?? null,
      });

      if (isExternal && event?.registration_url) {
        Toast.show({ type: "success", text1: t("events.waitingListNotice") });
        const { openBrowserAsync } = await import("expo-web-browser");
        await openBrowserAsync(event.registration_url);
      } else {
        Toast.show({ type: "success", text1: t("events.requestSent") });
      }

      void queryClient.invalidateQueries({ queryKey: ["join-request-status", "event", eventId] });
    },
    onError: () => Toast.show({ type: "error", text1: t("common.error") }),
  });

  const { isFavorited, favCount, isPending, toggle } = useToggleFavorite({
    entityType: "event",
    id: eventId ?? "",
    extraInvalidationKeys: [["event", eventId]],
  });

  if (!event) {
    if (eventLoading) {
      return <EventLoadingSkeleton />;
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
  // One row per practiced sport with its configured level (settings `sports[]` /
  // `required_levels`, legacy `required_level` merged in by the helper).
  const perSportLevels = buildSportLevelRows(
    event.sports,
    event.required_levels as Record<string, string> | null,
    event.required_level,
    event.sport
  ).map((entry) => ({
    sport: entry.sport,
    label: SPORTS.find((s) => s.id === entry.sport)?.label ?? entry.sport,
    level: entry.level,
  }));
  const placeParts = [event.venue_address, event.postal_code, event.city, getCountryDisplay(event.country)].filter(
    (part): part is string => !!part && part.trim().length > 0
  );
  const placeValue = placeParts.join(", ");
  const isCreator = !!userId && event.created_by === userId;

  // Sports the event practices (settings `sports[]`, legacy `sport` fallback).
  const eventSports = practicedSports(event.sports, event.sport);
  const levelRows: LevelRow[] = perSportLevels.map((e) => ({ sport: e.sport, label: e.label, level: e.level }));

  // Canonical, shareable link for this event:
  // - Web: the live origin so the copied/shared link actually opens the page.
  // - Native: the app public web URL.
  const eventShareUrl =
    Platform.OS === "web" && typeof window !== "undefined" && window.location?.origin
      ? `${window.location.origin}/events/${event.id}`
      : `https://pulse.app/event/${event.id}`;
  const eventShareMessage = `${event.name} — Pulse`;

  // Opens the OS share sheet AND copies the event link to the clipboard.
  const handleShare = async () => {
    // Copy first so the link stays available even if the sheet is dismissed.
    try {
      if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(eventShareUrl);
      } else {
        await Clipboard.setStringAsync(eventShareUrl);
      }
    } catch {
      // Clipboard can be blocked (permissions / insecure context) - the share
      // sheet below still carries the link, so this is non-fatal.
    }

    if (Platform.OS === "web") {
      type WebShareData = { title?: string; text?: string; url?: string };
      const nav =
        typeof navigator !== "undefined"
          ? (navigator as Navigator & {
              share?: (data: WebShareData) => Promise<void>;
              canShare?: (data: WebShareData) => boolean;
            })
          : undefined;
      const shareData = { title: event.name, text: eventShareMessage, url: eventShareUrl };
      if (nav?.share && (typeof nav.canShare !== "function" || nav.canShare(shareData))) {
        try {
          await nav.share(shareData);
        } catch {
          // User dismissed the OS share sheet - the link is already copied.
        }
      }
    } else {
      try {
        await Share.share({
          title: event.name,
          message: `${eventShareMessage}\n${eventShareUrl}`,
          url: eventShareUrl,
        });
      } catch {
        // User dismissed the share sheet.
      }
    }

    Toast.show({ type: "success", text1: t("events.linkCopied") });
    posthog.capture("event_shared", { event_id: event.id });
  };

  // The external action must never dead-end while a source page exists:
  // imported rows always store a registration link (the normalizer falls back
  // to the source URL), but if only `source_url` is known, open that instead.
  const registrationUrl =
    event.registration_url?.trim() || (event.is_external ? event.source_url?.trim() || null : null);
  const shortDescription = event.short_description?.trim() || null;
  const longDescription = event.description?.trim() || null;

  const openExternalRegistration = async () => {
    if (!registrationUrl) return;
    posthog.capture("external_event_registration_opened", {
      event_id: event.id,
      source_name: event.source_name ?? null,
    });
    const { openBrowserAsync } = await import("expo-web-browser");
    await openBrowserAsync(registrationUrl);
  };

  let actionButton: React.ReactNode = null;
  if (isExternal) {
    actionButton = (
      <Button
        testID="event-detail-register-button"
        title={t("events.register")}
        icon="Globe"
        onPress={registrationUrl ? () => void openExternalRegistration() : undefined}
        disabled={!registrationUrl}
      />
    );
  } else if (!isCreator) {
    if (joinStatus?.isMember) {
      actionButton = (
        <Button
          title={t("events.participant")}
          variant="secondary"
          icon="CheckCircle2"
          disabled
        />
      );
    } else if (joinStatus?.isPending) {
      actionButton = (
        <Button
          title={isExternal ? t("events.waitingList") : t("events.requestSent")}
          variant="secondary"
          icon={isExternal ? "Globe" : "Clock"}
          onPress={isExternal && registrationUrl ? () => void openExternalRegistration() : undefined}
          disabled={!isExternal || !registrationUrl}
        />
      );
    } else if (isFull) {
      actionButton = <Button title={t("events.full")} variant="secondary" disabled />;
    } else {
      actionButton = (
        <Button
          testID="event-detail-join-button"
          title={
            isExternal
              ? t("events.register")
              : event.is_private
                ? t("events.requestJoin")
                : t("events.join")
          }
          icon={isExternal ? "Globe" : "CheckCircle2"}
          onPress={() => {
            if (isExternal && registrationUrl) void openExternalRegistration();
            else joinMut.mutate();
          }}
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

  // ── Derived display data for the composed detail sections ──────────────
  // Contact & link rows (website, registration, email) for the links section.
  const linkRows: LinkRowData[] = [];
  if (event.website_url) {
    linkRows.push({ icon: "Globe", label: t("forms.website"), value: event.website_url, url: event.website_url });
  }
  if (registrationUrl) {
    linkRows.push({ icon: "ExternalLink", label: t("create.event.registrationLink"), value: registrationUrl, url: registrationUrl });
  }
  if (event.contact_email) {
    linkRows.push({ icon: "Mail", label: t("create.event.contactEmailShort"), value: event.contact_email, url: `mailto:${event.contact_email}` });
  }

  // Price label shared by the stat tile. Imported OpenAgenda rows with an
  // unknown (<=0) price never read as free — they point back to the source.
  const priceLabel =
    event.source_name === "OpenAgenda" && event.price_cents <= 0
      ? t("events.externalPrice")
      : formatPriceFromCents(event.price_cents, event.is_paid, t("events.priceFree"));

  const participantsCount = event.accepted_count ?? 0;
  const stats: StatData[] = [];
  if (participantsCount > 0) {
    stats.push({ icon: "Users", label: t("events.participants"), value: String(participantsCount), onPress: "participants" });
  }
  stats.push({ icon: "Tag", label: t("events.price"), value: priceLabel });

  // Responsive sizing (mirrors the club detail screen breakpoints).
  const isWide = winWidth >= 700;
  const isMd = winWidth >= 500;
  const coverH = winWidth > 500 ? 240 : 180;
  const galleryW = winWidth > 500 ? winWidth - 32 : winWidth - 16;

  // Imported external rows have no Pulse participation at all, so a
  // "0 registered" row would imply an in-app sign-up list exists. Rows with
  // in-app participants or a places limit keep it.
  const showPlacesRow = !(event.is_external && participantsCount === 0 && event.places_total == null);

  return (
    <SafeScreen className="flex-1 bg-neutral-50 dark:bg-[#0A0F1C]" edges={["top"]}>
      <Stack.Screen options={{ title: event.name }} />

      <EventActionHeader eventId={event.id} canManage={canManage} />

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
        {/* Hero cover with floating favorite + share chips */}
        <EventHeroBar
          cover={coverImage}
          coverH={coverH}
          isFavorited={!!isFavorited}
          favCount={favCount ?? 0}
          isFavPending={isPending}
          onToggle={() => toggle()}
          onShare={handleShare}
        />

        {/* Identity: logo, title, short description, sport + source + privacy pills */}
        <EventIdentity event={event} shortDesc={shortDescription} sports={eventSports} organizingClub={organisingClub} />

        {/* Stat tiles: responsive, wrap to any screen width */}
        <EventStatTiles
          stats={stats}
          isWide={isWide}
          isMd={isMd}
          onParticipantsPress={() => setShowMembersList(true)}
        />

        {/* Organizer (person or club) */}
        <EventOrganizerCard organizer={eventCreator as EventCreator | undefined} loading={creatorLoading} />

        {/* Long description */}
        <EventDescriptionCard description={longDescription} />

        {/* Info sections: when, where, details */}
        <EventInfoGrid
          event={event}
          isWide={isWide}
          levelRows={levelRows}
          placeValue={placeValue || (event.city || event.country ? `${event.city ?? ""}${event.city && event.country ? ", " : ""}${getCountryDisplay(event.country)}` : "")}
          placesLabel={showPlacesRow ? placesLabel : null}
        />

        {/* Participants strip + see-all */}
        <EventParticipantsSection
          participants={allParticipants}
          count={participantsCount}
          loading={loadingAllParticipants}
          onSeeAll={() => setShowMembersList(true)}
        />

        {/* Contact & links (website, registration, email) */}
        <EventContactLinks linkRows={linkRows} />

        {/* Photo gallery */}
        {galleryUrls.length > 0 ? (
          <EventPhotoGallery
            urls={galleryUrls}
            itemWidth={galleryW}
            itemHeight={Math.min(Math.round(galleryW * 0.42), 200)}
          />
        ) : null}

        <View style={{ height: 12 }} />
      </ScrollView>

      {/* Sticky bottom action bar: primary CTA + invite */}
      <EventActionsBar
        action={actionButton}
        actionVisible={actionVisible}
        canInvite={isCreator && !!event.is_private}
        eventId={event.id}
        caption={isFull ? t("events.placesLeft") : null}
      />

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
    </SafeScreen>
  );
}


