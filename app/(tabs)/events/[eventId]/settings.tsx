// ---------------------------------------------------------------------------
// PULSE — Event settings (managers only)
//
// Complete edit surface for the people who manage an event: its creator, or the
// owner/admin of the club it was published through (`useCanManageEvent`).
// It mirrors the public creation form field-for-field so anything can still be
// fixed after publishing, and ends with the destructive action: cancel/delete
// the event (hard delete + participants/club members notified).
//
// Permission model:
//   * client guard → `useCanManageEvent` (drives the UI only)
//   * server guard → RLS policies from migration 057 (source of truth)
//
// Media follows the creation flow: new picks are uploaded on save, and any
// previously stored image that is no longer referenced is cleaned up then.
// ---------------------------------------------------------------------------

import { useEffect, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useQuery } from "@tanstack/react-query";
import Toast from "react-native-toast-message";
import { SafeScreen } from "@/components/shared/SafeScreen";
import { BackButton } from "@/components/ui/BackButton";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { NativeDateField } from "@/components/ui/NativeDateField";
import { Text } from "@/components/ui/Text";
import { TextButton } from "@/components/ui/TextButton";
import { CancelEventSheet } from "@/components/clubs/CancelEventSheet";
import { CountryPicker, CoverPicker, PhotosPicker } from "@/components/events/EventFormPickers";
import {
  EventDescriptionsFields,
  EventLevelsPerSport,
  EventSectionTitle,
  SportPicker,
} from "@/components/events/EventFormSections";
import { EventHostingSelector, type EventHosting } from "@/components/events/EventHostingSelector";
import { useCanManageEvent } from "@/hooks/useCanManageEvent";
import { useCancelEvent } from "@/hooks/useCancelEvent";
import { useUpdateEvent, type EventUpdateData } from "@/hooks/useUpdateEvent";
import {
  MAX_EVENT_PHOTOS,
  deleteEventMedia,
  uploadEventCover,
  uploadEventPhoto,
} from "@/lib/eventMedia";
import { buildPickerImageOptions, toPickedImage, type PickedImage } from "@/lib/mediaPipeline";
import { useKeyboardHeight } from "@/lib/keyboardUtils";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { useTranslation } from "@/hooks/useTranslation";
import { formatDateTimeLocalized } from "@/utils/date";
import { localizeError } from "@/utils/localizeError";
import { normalizeLink } from "@/utils/links";
import { eventPrivateSchema, eventPublicSchema } from "@/utils/validation";
import type { EventRow } from "@/types";

/**
 * One photo slot in the gallery. A slot is either a stored URL (`url`) already
 * persisted on the event, or a freshly picked image (`image`) still living on
 * the device and uploaded when the form is saved.
 */
type PhotoSlot = { id: string; uri: string; url?: string; image?: PickedImage };

/** `price_cents` → editable euro string (empty when the event is free). */
function centsToPriceInput(cents: number | null): string {
  if (!cents) return "";
  return (cents / 100).toFixed(2).replace(/\.00$/, "");
}

/**
 * Order-insensitive comparison used to build the update diff: arrays (sports,
 * hero_urls), JSON objects (required_levels) and scalars/null all compare by
 * value, so a field is only sent when it genuinely changed.
 */
function sameValue(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((value, index) => value === b[index]);
  }
  if (a && b && typeof a === "object" && typeof b === "object") {
    const aKeys = Object.keys(a as Record<string, unknown>).sort();
    const bKeys = Object.keys(b as Record<string, unknown>).sort();
    return (
      aKeys.length === bKeys.length &&
      aKeys.every(
        (key, index) =>
          key === bKeys[index] &&
          sameValue((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]),
      )
    );
  }
  return (a ?? null) === (b ?? null);
}

export default function EventSettingsScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const router = useRouter();
  const { t, language } = useTranslation();
  const keyboardHeight = useKeyboardHeight();
  const updateEvent = useUpdateEvent();
  const cancelEvent = useCancelEvent();
  const userId = useAuthStore((s) => s.userId);

  const {
    data: event,
    isLoading,
    isError,
    refetch,
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
      return (data as EventRow | null) ?? null;
    },
  });

  // Creator, or owner/admin of the publishing club (client-side mirror of the
  // RLS policies added in supabase/migrations/057).
  const { canManage, isLoading: permissionLoading } = useCanManageEvent(event ?? null);

  // ── Editable form state ──────────────────────────────────────────────────
  const [name, setName] = useState("");
  const [sports, setSports] = useState<string[]>([]);
  const [requiredLevels, setRequiredLevels] = useState<Record<string, string>>({});
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [venueAddress, setVenueAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [league, setLeague] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [hosting, setHosting] = useState<EventHosting>("in_app");
  const [registrationUrl, setRegistrationUrl] = useState("");
  const [priceInput, setPriceInput] = useState("");
  const [placesTotal, setPlacesTotal] = useState("");
  const [ageMin, setAgeMin] = useState("");
  const [ageMax, setAgeMax] = useState("");
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [endDateError, setEndDateError] = useState("");
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [photoSlots, setPhotoSlots] = useState<PhotoSlot[]>([]);
  const [newCover, setNewCover] = useState<PickedImage | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [levelErrors, setLevelErrors] = useState<Record<string, string>>({});
  const [hydrated, setHydrated] = useState(false);
  const [showCancel, setShowCancel] = useState(false);

  // Seed the form from the loaded row exactly once so later refetches never
  // overwrite what the manager is typing (same pattern as the club settings).
  useEffect(() => {
    if (!event || hydrated) return;
    setName(event.name ?? "");
    setSports(event.sports?.length ? event.sports : event.sport ? [event.sport] : []);
    setRequiredLevels((event.required_levels as Record<string, string> | null) ?? {});
    setShortDescription(event.short_description ?? "");
    setDescription(event.description ?? "");
    setCountry(event.country ?? "");
    setCity(event.city ?? "");
    setVenueAddress(event.venue_address ?? "");
    setPostalCode(event.postal_code ?? "");
    setContactEmail(event.contact_email ?? "");
    setLeague(event.league ?? "");
    setWebsiteUrl(event.website_url ?? "");
    setHosting(event.is_external ? "external" : "in_app");
    setRegistrationUrl(event.registration_url ?? "");
    setPriceInput(centsToPriceInput(event.price_cents));
    setPlacesTotal(event.places_total != null ? String(event.places_total) : "");
    setAgeMin(event.age_min != null ? String(event.age_min) : "");
    setAgeMax(event.age_max != null ? String(event.age_max) : "");
    setStartDate(event.start_date ? new Date(event.start_date) : new Date());
    setEndDate(event.end_date ? new Date(event.end_date) : null);
    setCoverUrl(event.cover_url ?? null);
    setPhotoSlots(
      (event.hero_urls ?? [])
        .slice(0, MAX_EVENT_PHOTOS)
        .map((url, index) => ({ id: `saved-${index}-${url}`, uri: url, url })),
    );
    setHydrated(true);
  }, [event, hydrated]);

  // ── Media pickers (same pipeline as the creation forms) ──────────────────
  const pickCover = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync(buildPickerImageOptions());
    const asset = result.canceled ? null : result.assets[0];
    if (asset) setNewCover(toPickedImage(asset));
  };

  const pickPhotos = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const remaining = MAX_EVENT_PHOTOS - photoSlots.length;
    if (remaining <= 0) return;
    const result = await ImagePicker.launchImageLibraryAsync(
      buildPickerImageOptions({ multiple: true, selectionLimit: remaining }),
    );
    if (result.canceled) return;
    const picked = result.assets.map(toPickedImage).slice(0, remaining);
    setPhotoSlots((prev) => [
      ...prev,
      ...picked.map((image, index) => ({
        id: `picked-${Date.now()}-${index}`,
        uri: image.uri,
        image,
      })),
    ]);
  };

  /** Replace one gallery slot in place (the replaced image is cleaned on save). */
  const replacePhoto = async (index: number) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync(buildPickerImageOptions());
    const asset = result.canceled ? null : result.assets[0];
    if (!asset) return;
    const image = toPickedImage(asset);
    setPhotoSlots((prev) =>
      prev.map((slot, i) =>
        i === index ? { id: `picked-${Date.now()}-${i}`, uri: image.uri, image } : slot,
      ),
    );
  };

  const removePhoto = (index: number) => {
    setPhotoSlots((prev) => prev.filter((_, i) => i !== index));
  };

  /** Leave the settings screen, falling back to the event page on a cold load. */
  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace(`/(tabs)/events/${eventId}`);
  };

  /** Cancel/delete: hard-deletes the event and notifies everyone involved. */
  const handleConfirmCancel = (message?: string) => {
    if (!event || !eventId) return;
    setShowCancel(false);
    cancelEvent.mutate(
      {
        eventId,
        eventName: event.name,
        clubId: event.publisher_club_id ?? event.club_id,
        message,
      },
      { onSuccess: () => router.replace("/(tabs)/events") },
    );
  };

  /** Validate, then persist only what actually changed. */
  const handleSave = async () => {
    if (!event || !eventId || !userId) return;

    const primarySport = sports[0] ?? "";
    const priceCents = Math.round((parseFloat(priceInput.replace(",", ".")) || 0) * 100);
    // Only keep levels for the sports that are still selected.
    const levelMap = Object.fromEntries(
      Object.entries(requiredLevels).filter(([id, level]) => !!level?.trim() && sports.includes(id)),
    );
    const trimmedRegistration = registrationUrl.trim();
    const trimmedWebsite = websiteUrl.trim();

    // Validate with the exact schemas the creation flows use (private events
    // follow the lighter private rules) so an edit can never persist a state
    // the create form would have refused.
    const schema = event.is_private ? eventPrivateSchema : eventPublicSchema;
    const validation = schema.safeParse({
      name: name.trim(),
      sport: primarySport,
      sports,
      required_levels: levelMap,
      short_description: shortDescription.trim(),
      description: description.trim(),
      country,
      city,
      hosting,
      registration_url: trimmedRegistration ? normalizeLink(trimmedRegistration) : "",
      venue_address: venueAddress.trim(),
      postal_code: postalCode.trim() || undefined,
      contact_email: contactEmail.trim() || undefined,
      league: league.trim(),
      website_url: trimmedWebsite ? normalizeLink(trimmedWebsite) : "",
      price_cents: priceCents,
      age_min: ageMin.trim() ? Number(ageMin) : undefined,
      age_max: ageMax.trim() ? Number(ageMax) : undefined,
      places_total: placesTotal.trim() ? Math.max(1, Math.floor(Number(placesTotal))) : undefined,
      start_date: startDate.toISOString(),
      end_date: endDate?.toISOString(),
      hero_urls: photoSlots.map((slot) => slot.uri).slice(0, MAX_EVENT_PHOTOS),
    });

    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      const levelIssues: Record<string, string> = {};
      validation.error.errors.forEach((issue) => {
        const message = localizeError(issue.message, language) ?? issue.message;
        if (issue.path[0] === "required_levels") {
          levelIssues[String(issue.path[1] ?? "")] = message;
        } else {
          fieldErrors[String(issue.path[0] ?? "form")] = message;
        }
      });
      setErrors(fieldErrors);
      setLevelErrors(levelIssues);
      Toast.show({ type: "error", text1: t("create.event.missingFields") });
      return;
    }
    setErrors({});
    setLevelErrors({});

    // ── Diff against the loaded row (only changed fields are sent) ─────────
    const updateData: EventUpdateData = {};
    const oldData: Record<string, unknown> = {};
    const diff = <K extends keyof EventUpdateData>(
      key: K,
      next: EventUpdateData[K],
      previous: unknown,
    ) => {
      if (sameValue(next, previous)) return;
      updateData[key] = next;
      oldData[key] = previous ?? null;
    };

    diff("name", name.trim(), event.name);
    diff("short_description", shortDescription.trim(), event.short_description ?? "");
    diff("description", description.trim(), event.description ?? "");
    diff("sports", sports, event.sports ?? []);
    if (!sameValue(primarySport, event.sport)) {
      updateData.sport = primarySport;
      oldData.sport = event.sport;
    }
    diff("required_levels", levelMap, (event.required_levels as Record<string, string> | null) ?? {});
    const primaryLevel = levelMap[primarySport] ?? null;
    if (!sameValue(primaryLevel, event.required_level ?? null)) {
      updateData.required_level = primaryLevel;
      oldData.required_level = event.required_level;
    }
    diff("country", country, event.country);
    diff("city", city, event.city);
    diff("venue_address", venueAddress.trim() || null, event.venue_address ?? null);
    diff("postal_code", postalCode.trim() || null, event.postal_code ?? null);
    diff("contact_email", contactEmail.trim() || null, event.contact_email ?? null);
    diff("league", league.trim() || null, event.league ?? null);
    diff("website_url", trimmedWebsite ? normalizeLink(trimmedWebsite) : null, event.website_url ?? null);
    diff("is_external", hosting === "external", event.is_external);
    diff(
      "registration_url",
      hosting === "external" && trimmedRegistration ? normalizeLink(trimmedRegistration) : null,
      event.registration_url ?? null,
    );
    if (!sameValue(priceCents, event.price_cents) || !sameValue(priceCents > 0, event.is_paid)) {
      updateData.price_cents = priceCents;
      updateData.is_paid = priceCents > 0;
      oldData.price_cents = event.price_cents;
      oldData.is_paid = event.is_paid;
    }
    const nextPlacesTotal = placesTotal.trim() ? Math.max(1, Math.floor(Number(placesTotal))) : null;
    if (!sameValue(nextPlacesTotal, event.places_total ?? null)) {
      updateData.places_total = nextPlacesTotal;
      // `places_left` has no trigger: it mirrors `places_total` on insert and is
      // bumped when a participant leaves, so recompute it from the new capacity.
      updateData.places_left =
        nextPlacesTotal == null ? null : Math.max(0, nextPlacesTotal - (event.accepted_count ?? 0));
      oldData.places_total = event.places_total;
      oldData.places_left = event.places_left;
    }
    diff("age_min", ageMin.trim() ? Number(ageMin) : null, event.age_min ?? null);
    diff("age_max", ageMax.trim() ? Number(ageMax) : null, event.age_max ?? null);
    const originalStart = event.start_date ? new Date(event.start_date).toISOString() : null;
    diff("start_date", startDate.toISOString(), originalStart);
    const originalEnd = event.end_date ? new Date(event.end_date).toISOString() : null;
    diff("end_date", endDate?.toISOString() ?? null, originalEnd);

    // ── Media ──────────────────────────────────────────────────────────────
    const originalHeroUrls = event.hero_urls ?? [];
    const coverChanged = !!newCover || !sameValue(coverUrl, event.cover_url ?? null);
    const heroesChanged =
      photoSlots.length !== originalHeroUrls.length ||
      photoSlots.some(
        (slot, index) =>
          !!slot.image || !sameValue(slot.url ?? null, originalHeroUrls[index] ?? null),
      );

    // Nothing to persist: leave without hitting the network.
    if (Object.keys(updateData).length === 0 && !coverChanged && !heroesChanged) {
      close();
      return;
    }

    // Upload the newly picked images, then free every stored image that is no
    // longer referenced (replaced cover, replaced or removed photo).
    const nextCoverUrl = newCover ? await uploadEventCover(userId, newCover) : coverUrl;
    const nextHeroUrls: string[] = [];
    for (let index = 0; index < photoSlots.length; index++) {
      const slot = photoSlots[index]!;
      nextHeroUrls.push(slot.image ? await uploadEventPhoto(userId, slot.image, index) : slot.url!);
    }
    const stillUsed = new Set([nextCoverUrl, ...nextHeroUrls].filter((url): url is string => !!url));
    for (const url of [event.cover_url, ...originalHeroUrls]) {
      if (url && !stillUsed.has(url)) await deleteEventMedia(url);
    }

    // The picked images now exist in storage: adopting their URLs keeps a failed
    // save retryable without uploading everything a second time.
    setNewCover(null);
    setCoverUrl(nextCoverUrl);
    setPhotoSlots(
      nextHeroUrls.map((url, index) => ({ id: `saved-${index}-${url}`, uri: url, url })),
    );

    diff("cover_url", nextCoverUrl, event.cover_url ?? null);
    diff("hero_urls", nextHeroUrls, originalHeroUrls);

    updateEvent.mutate({ eventId, data: updateData, oldData }, { onSuccess: () => close() });
  };

  // ── Guards ───────────────────────────────────────────────────────────────
  if (isLoading || (!event && !isError) || (!!event && !canManage && permissionLoading)) {
    return (
      <SafeScreen className="flex-1 items-center justify-center bg-neutral-50 dark:bg-[#0A0F1E]">
        <LoadingSpinner />
      </SafeScreen>
    );
  }

  if (isError) {
    return (
      <SafeScreen className="flex-1 bg-neutral-50 dark:bg-[#0A0F1E]">
        <ErrorState
          testID="event-settings-error"
          title={t("events.list.loadErrorTitle")}
          message={t("events.detail.loadErrorBody")}
          onRetry={() => void refetch()}
        />
        <Button title={t("common.back")} variant="secondary" className="mx-6" onPress={close} />
      </SafeScreen>
    );
  }

  if (!event) {
    return (
      <SafeScreen className="flex-1 items-center justify-center bg-neutral-50 dark:bg-[#0A0F1E]">
        <EmptyState
          testID="event-settings-not-found"
          icon="Calendar"
          title={t("events.notFound")}
          subtitle={t("events.detail.notFoundHint")}
          ctaLabel={t("common.back")}
          onCta={close}
        />
      </SafeScreen>
    );
  }

  // Managers only (creator or publishing-club owner/admin). RLS enforces the
  // same rule server-side; this only replaces the form with an explanation.
  if (!canManage) {
    return (
      <SafeScreen className="flex-1 items-center justify-center bg-neutral-50 dark:bg-[#0A0F1E]">
        <Stack.Screen options={{ title: t("events.settings") }} />
        <EmptyState
          testID="event-settings-forbidden"
          icon="Lock"
          title={t("events.settings")}
          subtitle={t("events.settings.adminOnly")}
          ctaLabel={t("common.back")}
          onCta={close}
        />
      </SafeScreen>
    );
  }

  return (
    <SafeScreen className="flex-1 bg-neutral-50 dark:bg-[#0A0F1E]" edges={["top"]}>
      <Stack.Screen options={{ title: t("events.settings") }} />

      <View className="flex-row items-center px-3 py-2">
        <BackButton useInAppSession />
        <Text variant="h2" className="flex-1 text-center" numberOfLines={1}>
          {t("events.settings")}
        </Text>
        <View className="w-11" />
      </View>

      <ScrollView
        className="flex-1 px-4 pt-4"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: keyboardHeight > 0 ? keyboardHeight + 100 : 100 }}
        testID="event-settings-form"
      >
        {/* ── 1. The essentials ────────────────────────────────────────── */}
        <Card className="p-4 mb-4">
          <EventSectionTitle step={1} title={t("create.event.sections.essentials")} />
          <Input
            label={`${t("create.event.name")} *`}
            value={name}
            onChangeText={setName}
            error={errors.name}
            placeholder={t("create.event.example")}
            maxLength={80}
            testID="event-settings-name"
          />
          <View className="mt-4" />
          <SportPicker value={sports} onChange={setSports} error={errors.sports} />
          <EventLevelsPerSport
            sports={sports}
            values={requiredLevels}
            onChange={setRequiredLevels}
            errors={levelErrors}
          />

          <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2 mt-2">
            {t("create.event.startDate")} *
          </Text>
          <NativeDateField
            mode="datetime"
            value={startDate}
            onChange={(date) => {
              setStartDate(date);
              if (endDate && date >= endDate) {
                setEndDate(null);
                setEndDateError(t("events.endAfterStart"));
              }
            }}
            title={t("create.event.startDate")}
            confirmLabel={t("common.ok")}
            cancelLabel={t("common.cancel")}
            accessibilityLabel={t("create.event.startDate")}
            testID="event-settings-start-date"
            renderTrigger={(date) => (
              <View className="border border-neutral-300 dark:border-neutral-700 rounded-xl px-4 py-3">
                <Text className="text-neutral-900 dark:text-neutral-50">
                  {formatDateTimeLocalized(date.toISOString(), { language })}
                </Text>
              </View>
            )}
          />
          {errors.start_date ? (
            <Text className="text-error text-sm mt-1">{errors.start_date}</Text>
          ) : null}

          <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2 mt-4">
            {t("create.event.endDate")}
          </Text>
          <NativeDateField
            mode="datetime"
            value={endDate ?? startDate}
            onChange={(date) => {
              if (date <= startDate) {
                setEndDateError(t("events.endAfterStart"));
              } else {
                setEndDateError("");
                setEndDate(date);
              }
            }}
            title={t("create.event.endDate")}
            confirmLabel={t("common.ok")}
            cancelLabel={t("common.cancel")}
            accessibilityLabel={t("create.event.endDate")}
            testID="event-settings-end-date"
            renderTrigger={(date) => (
              <View className="border border-neutral-300 dark:border-neutral-700 rounded-xl px-4 py-3">
                <Text className="text-neutral-900 dark:text-neutral-50">
                  {endDate ? formatDateTimeLocalized(date.toISOString(), { language }) : "—"}
                </Text>
              </View>
            )}
          />
          {endDateError ? <Text className="text-error text-sm mt-1">{endDateError}</Text> : null}
          {endDate ? (
            <TextButton
              tone="danger"
              size="sm"
              onPress={() => {
                setEndDate(null);
                setEndDateError("");
              }}
              accessibilityLabel={t("common.delete")}
              className="mt-2 self-start"
            >
              {t("common.delete")}
            </TextButton>
          ) : null}

          <View className="mt-4" />
          <EventDescriptionsFields
            shortDescription={shortDescription}
            onChangeShort={setShortDescription}
            description={description}
            onChangeDescription={setDescription}
            shortError={errors.short_description}
            longError={errors.description}
          />
        </Card>

        {/* ── 2. Where ─────────────────────────────────────────────────── */}
        <Card className="p-4 mb-4">
          <EventSectionTitle step={2} title={t("create.event.sections.location")} />
          <CountryPicker value={country} onChange={setCountry} error={errors.country} />
          <Input
            label={`${t("create.event.city")} *`}
            value={city}
            onChangeText={setCity}
            error={errors.city}
            placeholder={t("create.event.city")}
            testID="event-settings-city"
          />
          <View className="mt-4" />
          <Input
            label={t("create.event.exactAddress")}
            value={venueAddress}
            onChangeText={setVenueAddress}
            placeholder={t("create.event.exactAddressPlaceholder")}
            testID="event-settings-address"
          />
          <View className="mt-4" />
          <Input
            label={t("create.event.postalCode")}
            value={postalCode}
            onChangeText={setPostalCode}
            placeholder={t("create.event.postalCodePlaceholder")}
            keyboardType="number-pad"
            maxLength={20}
            error={errors.postal_code}
            testID="event-settings-postal-code"
          />
        </Card>

        {/* ── 3. Participation ─────────────────────────────────────────── */}
        <Card className="p-4 mb-4">
          <EventSectionTitle step={3} title={t("create.event.sections.participation")} />
          <EventHostingSelector
            value={hosting}
            onChange={(next) => {
              setHosting(next);
              setErrors((prev) => ({ ...prev, registration_url: "" }));
            }}
            link={registrationUrl}
            onChangeLink={(value) => {
              setRegistrationUrl(value);
              setErrors((prev) => ({ ...prev, registration_url: "" }));
            }}
            linkError={errors.registration_url}
            disabled={updateEvent.isPending}
          />
          <Input
            label={t("create.event.websiteUrl")}
            value={websiteUrl}
            onChangeText={setWebsiteUrl}
            placeholder="https://"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            textContentType="URL"
            error={errors.website_url}
            testID="event-settings-website"
          />
          <View className="mt-4" />
          <Input
            label={t("create.event.contactEmail")}
            value={contactEmail}
            onChangeText={setContactEmail}
            placeholder="contact@exemple.com"
            autoCapitalize="none"
            keyboardType="email-address"
            error={errors.contact_email}
            testID="event-settings-contact-email"
          />
          <View className="mt-4" />
          <Input
            label={t("create.event.league")}
            value={league}
            onChangeText={setLeague}
            placeholder={t("create.event.leaguePlaceholder")}
            testID="event-settings-league"
          />
          <View className="mt-4" />
          <Input
            label={t("create.event.price")}
            value={priceInput}
            onChangeText={(value) => setPriceInput(value.replace(/[^0-9.,]/g, ""))}
            keyboardType="decimal-pad"
            placeholder="0"
            help={t("create.event.priceHint")}
            rightElement={<Text className="text-base font-semibold text-neutral-500">€</Text>}
            testID="event-settings-price"
          />
          <View className="mt-4" />
          <Input
            label={t("create.event.totalSlots")}
            value={placesTotal}
            onChangeText={(value) => setPlacesTotal(value.replace(/[^0-9]/g, ""))}
            keyboardType="number-pad"
            placeholder={t("events.unlimitedIfEmpty")}
            help={t("create.event.placesHint")}
            testID="event-settings-places"
          />
        </Card>

        {/* ── 4. Details ───────────────────────────────────────────────── */}
        <Card className="p-4 mb-4">
          <EventSectionTitle step={4} title={t("create.event.sections.details")} />
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Input
                label={t("create.event.ageMin")}
                value={ageMin}
                onChangeText={(value) => setAgeMin(value.replace(/[^0-9]/g, ""))}
                keyboardType="number-pad"
                placeholder="—"
                error={errors.age_min}
                testID="event-settings-age-min"
              />
            </View>
            <View className="flex-1">
              <Input
                label={t("create.event.ageMax")}
                value={ageMax}
                onChangeText={(value) => setAgeMax(value.replace(/[^0-9]/g, ""))}
                keyboardType="number-pad"
                placeholder="—"
                error={errors.age_max}
                testID="event-settings-age-max"
              />
            </View>
          </View>
        </Card>

        {/* ── 5. Media ─────────────────────────────────────────────────── */}
        <Card className="p-4 mb-4">
          <EventSectionTitle step={5} title={t("create.event.sections.media")} />
          <CoverPicker
            url={newCover?.uri ?? coverUrl}
            onPick={() => void pickCover()}
            onRemove={() => {
              setNewCover(null);
              setCoverUrl(null);
            }}
            disabled={updateEvent.isPending}
          />
          <PhotosPicker
            uris={photoSlots.map((slot) => slot.uri)}
            onAdd={() => void pickPhotos()}
            onChange={(index) => void replacePhoto(index)}
            onRemove={removePhoto}
          />
        </Card>

        <Button
          title={t("common.save")}
          onPress={() => void handleSave()}
          loading={updateEvent.isPending}
          disabled={updateEvent.isPending}
          testID="event-settings-save"
        />

        {/* ── Danger zone ──────────────────────────────────────────────── */}
        <Card className="p-4 mt-6 mb-4">
          <View className="flex-row items-center gap-2 mb-2">
            <Icon name="Trash2" size={18} color="error-500" />
            <Text className="flex-1 text-base font-semibold text-neutral-900 dark:text-neutral-50">
              {t("events.settings.dangerZone")}
            </Text>
          </View>
          <Text variant="caption" className="mb-4">
            {t("events.settings.deleteBody")}
          </Text>
          <Button
            title={t("events.cancelAction")}
            icon="Trash2"
            variant="destructive"
            onPress={() => setShowCancel(true)}
            disabled={updateEvent.isPending || cancelEvent.isPending}
            testID="event-settings-cancel"
          />
        </Card>
      </ScrollView>

      {/* Cancel/delete confirmation — hard-deletes the event and notifies
          participants + club members (see useCancelEvent). */}
      <CancelEventSheet
        visible={showCancel}
        eventName={event.name}
        onClose={() => setShowCancel(false)}
        isLoading={cancelEvent.isPending}
        onConfirm={handleConfirmCancel}
      />
    </SafeScreen>
  );
}
