import { EventHostingSelector, type EventHosting } from "@/components/events/EventHostingSelector";
import { EventIdentitySelector } from "@/components/events/EventIdentitySelector";
import {
  EventDescriptionsFields,
  EventLevelsPerSport,
  EventSectionTitle,
  SportPicker,
} from "@/components/events/EventFormSections";
import { CountryPicker, CoverPicker, PhotosPicker } from "@/components/events/EventFormPickers";
import { MAX_EVENT_PHOTOS, uploadEventCover, uploadEventPhoto } from "@/lib/eventMedia";
import { normalizeLink } from "@/utils/links";
import { useEventPublishingIdentity } from "@/hooks/useEventPublishingIdentity";
import { BackButton } from "@/components/ui/BackButton";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { eventPublicSchema } from "@/utils/validation";
import { localizeError } from "@/utils/localizeError";
import * as ImagePicker from "expo-image-picker";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useState, useEffect } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeScreen } from "@/components/shared/SafeScreen";
import Toast from "react-native-toast-message";
import { useMutation, useQuery } from "@tanstack/react-query";
import { NativeDateField } from "@/components/ui/NativeDateField";
import { useKeyboardHeight } from "@/lib/keyboardUtils";
import { t } from "@/hooks/useTranslation";

function formatEventDateTime(d: Date): string {
  return d.toLocaleDateString("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CreatePublicEventScreen() {
  const router = useRouter();
  const userId = useAuthStore((s) => s.userId);
  const { clubId: clubIdParam } = useLocalSearchParams<{ clubId?: string }>();
  const keyboardHeight = useKeyboardHeight();

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["profile", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", userId!).single();
      return data;
    },
  });

  const identity = useEventPublishingIdentity(userId, clubIdParam);
  const clubId = identity.publisherClubId;

  const [name, setName] = useState("");

  // Multi-sport: `sports` is the full selection, `sports[0]` is the primary
  // sport stored in the `sport` column (cards, filters, search).
  const [sports, setSports] = useState<string[]>([]);
  const [requiredLevels, setRequiredLevels] = useState<Record<string, string>>({});
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  // Sync country/city from profile once loaded
  const [synced, setSynced] = useState(false);
  useEffect(() => {
    if (profile && !synced) {
      if (profile.country) setCountry(profile.country);
      if (profile.city) setCity(profile.city);
      setSynced(true);
    }
  }, [profile, synced]);

  const [venueAddress, setVenueAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [hosting, setHosting] = useState<EventHosting>("in_app");
  const [registrationUrl, setRegistrationUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [league, setLeague] = useState("");
  const [priceInput, setPriceInput] = useState("");
  const [placesTotal, setPlacesTotal] = useState("");
  const [ageMin, setAgeMin] = useState("");
  const [ageMax, setAgeMax] = useState("");
  const [startDate, setStartDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)); // +7 days
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [endDateError, setEndDateError] = useState("");
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [heroUris, setHeroUris] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const primarySport = sports[0] ?? "";

  const pickCover = async () => {
    const p = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!p.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: false,
      quality: 0.8,
    });
    const uri = res.canceled ? null : res.assets[0]?.uri;
    if (uri) setCoverUri(uri);
  };

  const pickHeroPhotos = async () => {
    const p = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!p.granted) return;
    const remaining = MAX_EVENT_PHOTOS - heroUris.length;
    if (remaining <= 0) {
      Toast.show({ type: "info", text1: t("create.event.maxPhotos") });
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.8,
    });
    if (!res.canceled) {
      const newUris = res.assets.map((a) => a.uri);
      setHeroUris((prev) => [...prev, ...newUris].slice(0, MAX_EVENT_PHOTOS));
    }
  };

  /** Replace one photo in place (before upload, so there is nothing to delete). */
  const replaceHero = async (index: number) => {
    const p = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!p.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: false,
      quality: 0.8,
    });
    const uri = res.canceled ? null : res.assets[0]?.uri;
    if (!uri) return;
    setHeroUris((prev) => prev.map((u, i) => (i === index ? uri : u)));
  };

  const removeHero = (index: number) => {
    setHeroUris((prev) => prev.filter((_, i) => i !== index));
  };

  const createMut = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("auth");
      if (!identity.isValid) throw new Error(t("create.event.identityError"));
      if (!clubId && !profile?.is_public_profile) throw new Error(t("create.event.activatePublicHint"));

      const priceCents = Math.round((parseFloat(priceInput.replace(",", ".")) || 0) * 100);
      // Only keep levels for the sports that are still selected.
      const levelMap = Object.fromEntries(
        Object.entries(requiredLevels).filter(([id, level]) => !!level && sports.includes(id))
      );

      const data = {
        name,
        sport: primarySport,
        sports,
        required_levels: levelMap,
        short_description: shortDescription,
        description,
        country,
        city,
        hosting,
        registration_url: hosting === "external" && registrationUrl.trim() ? normalizeLink(registrationUrl) : "",
        venue_address: venueAddress,
        postal_code: postalCode,
        contact_email: contactEmail,
        league,
        price_cents: priceCents,
        age_min: ageMin.trim() ? Number(ageMin) : undefined,
        age_max: ageMax.trim() ? Number(ageMax) : undefined,
        places_total: placesTotal.trim() ? Math.max(1, Math.floor(Number(placesTotal))) : undefined,
        club_id: clubId || undefined,
        website_url: websiteUrl ? normalizeLink(websiteUrl) : "",
        start_date: startDate.toISOString(),
        end_date: endDate?.toISOString(),
      };

      const validation = eventPublicSchema.safeParse(data);
      if (!validation.success) {
        const errs: Record<string, string> = {};
        validation.error.errors.forEach((e) => {
          if (e.path[0]) errs[e.path[0] as string] = localizeError(e.message) ?? e.message;
        });
        setErrors(errs);
        throw new Error("Validation failed");
      }

      // Upload the optional cover, then the optional photos (0–5)
      const coverUrl = coverUri ? await uploadEventCover(userId, coverUri) : null;
      const heroUrls: string[] = [];
      for (let i = 0; i < heroUris.length; i++) {
        const url = await uploadEventPhoto(userId, heroUris[i]!, i);
        heroUrls.push(url);
      }

      const isExternal = hosting === "external";
      // Create event
      const { data: event, error: eventErr } = await supabase
        .from("events")
        .insert({
          name: name.trim(),
          sport: primarySport,
          sports,
          required_levels: levelMap,
          short_description: shortDescription.trim(),
          description: description.trim(),
          country,
          city,
          venue_address: venueAddress || null,
          postal_code: postalCode.trim() || null,
          contact_email: contactEmail.trim() || null,
          league: league.trim() || null,
          cover_url: coverUrl,
          registration_url: isExternal && registrationUrl.trim() ? normalizeLink(registrationUrl) : null,
          website_url: websiteUrl ? normalizeLink(websiteUrl) : null,
          is_external: isExternal,
          price_cents: priceCents,
          is_paid: priceCents > 0,
          required_level: levelMap[primarySport] ?? null,
          age_min: ageMin.trim() ? Number(ageMin) : null,
          age_max: ageMax.trim() ? Number(ageMax) : null,
          places_total: placesTotal.trim() ? Math.max(1, Math.floor(Number(placesTotal))) : null,
          places_left: placesTotal.trim() ? Math.max(1, Math.floor(Number(placesTotal))) : null,
          logo_url: null,
          hero_urls: heroUrls,
          start_date: startDate.toISOString(),
          end_date: endDate?.toISOString() || null,
          is_private: false,
          club_id: clubId || null,
          publisher_club_id: clubId || null,
          created_by: userId,
        } as any)
        .select("id")
        .single();

      if (eventErr || !event) throw eventErr ?? new Error("event creation failed");

      // Add creator as participant
      await supabase.from("event_participants").insert({
        event_id: event.id,
        user_id: userId,
        status: "confirmed",
      });

      // Notify club members if linked to a club (via SECURITY DEFINER RPC to bypass notifications RLS)
      if (clubId) {
        const { data: members } = await supabase
          .from("club_members")
          .select("user_id")
          .eq("club_id", clubId);
        for (const member of members ?? []) {
          if (member.user_id !== userId) {
            await supabase.rpc("notify_user", {
              p_user_id: member.user_id,
              p_type: "event_notification",
              p_title: t("create.event.newInClub"),
              p_body: `{t("create.event.new")} "${name}" {t("create.event.createdInClub")}`,
              p_data: { event_id: event.id, club_id: clubId },
            });
          }
        }
      }

      return event.id;
    },
    onSuccess: (eventId) => {
      Toast.show({ type: "success", text1: t("create.event.publicSuccess") });
      router.replace(`/(tabs)/events/${eventId}`);
    },
    onError: (err) => {
      if (err instanceof Error && err.message !== "Validation failed") {
        Toast.show({ type: "error", text1: err.message });
      }
    },
  });

  const hostingLinkError = errors.registration_url;
  const missing: string[] = [];
  if (!name.trim()) missing.push(t("create.event.name"));
  if (sports.length === 0) missing.push(t("create.event.sports"));
  const levelsComplete = sports.every((sport) => !!requiredLevels[sport]?.trim());
  if (sports.length > 0 && !levelsComplete) missing.push(t("create.event.levelPerSport"));
  if (!shortDescription.trim()) missing.push(t("create.event.shortDescription"));
  if (hosting === "external" && !registrationUrl.trim()) missing.push(t("create.event.registrationLink"));
  if (!country) missing.push(t("create.event.country"));
  if (!city.trim()) missing.push(t("create.event.city"));
  const isValid = identity.isValid && !profileLoading && (!!clubId || !!profile?.is_public_profile) && missing.length === 0;

  return (
    <SafeScreen className="flex-1 bg-neutral-50 dark:bg-[#0A0F1E]" edges={["top"]}>
      <View className="flex-row items-center px-4 py-3 border-b border-neutral-100 dark:border-neutral-800">
        <BackButton />
        <Text className="flex-1 text-lg font-bold text-center text-neutral-900 dark:text-neutral-50">
          {t("create.event.publicTitle")}
        </Text>
        <View className="w-11" />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: keyboardHeight > 0 ? keyboardHeight + 100 : 100 }}
        keyboardShouldPersistTaps="handled"
        className="px-4 pt-4"
      >
        <Text className="text-sm text-neutral-500 mb-4">{t("create.event.publicDesc")}</Text>
        <Card className="p-4 mb-4">
          <EventSectionTitle step={1} title={t("create.event.sections.identity")} hint={t("create.event.publicIdentityHint")} />
          <EventIdentitySelector profile={profile} clubs={identity.clubs} value={identity.publisherClubId}
            onChange={identity.setPublisherClubId} loading={identity.isPending} error={identity.isError}
            retry={() => { void identity.refetch(); }} disabled={createMut.isPending} />
          {!clubId && profile && !profile.is_public_profile && (
            <Text className="text-error mb-3">{t("create.event.activatePublicHint")}</Text>
          )}
        </Card>
        <Card className="p-4 mb-4">
          <EventSectionTitle step={2} title={t("create.event.sections.essentials")} />
          <Input
            label={`${t("create.event.name")} *`}
            value={name}
            onChangeText={setName}
            error={errors.name}
            placeholder={t("create.event.example")}
            maxLength={80}
          />
          <View className="mt-4" />
          <SportPicker value={sports} onChange={setSports} error={errors.sports} />
          <EventLevelsPerSport sports={sports} values={requiredLevels} onChange={setRequiredLevels} />
          <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2 mt-2">
            {t("create.event.startDate")} *
          </Text>
          <NativeDateField
            mode="datetime"
            value={startDate}
            onChange={(d) => {
              setStartDate(d);
              if (endDate && d >= endDate) {
                setEndDate(null);
                setEndDateError(t("events.endAfterStart"));
              }
            }}
            title={t("create.event.startDate")}
            confirmLabel={t("common.ok")}
            cancelLabel={t("common.cancel")}
            renderTrigger={() => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("create.event.startDate")}
                className="border border-neutral-300 dark:border-neutral-700 rounded-xl px-4 py-3 mb-4"
              >
                <Text className="text-neutral-900 dark:text-neutral-50">{formatEventDateTime(startDate)}</Text>
              </Pressable>
            )}
          />

          <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            {t("create.event.endDate")}
          </Text>
          <NativeDateField
            mode="datetime"
            value={endDate ?? startDate}
            onChange={(d) => {
              if (d <= startDate) {
                setEndDateError(t("events.endAfterStart"));
              } else {
                setEndDateError("");
                setEndDate(d);
              }
            }}
            title={t("create.event.endDate")}
            confirmLabel={t("common.ok")}
            cancelLabel={t("common.cancel")}
            renderTrigger={() => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("create.event.endDate")}
                className="border border-neutral-300 dark:border-neutral-700 rounded-xl px-4 py-3 mb-4"
              >
                <Text className="text-neutral-900 dark:text-neutral-50">
                  {endDate ? formatEventDateTime(endDate) : t("updateEvent.dateLabel")}
                </Text>
              </Pressable>
            )}
          />
          {endDateError ? (
            <Text className="text-error text-sm mb-4">{endDateError}</Text>
          ) : null}

          <EventDescriptionsFields
            shortDescription={shortDescription}
            onChangeShort={setShortDescription}
            description={description}
            onChangeDescription={setDescription}
            shortError={errors.short_description}
            longError={errors.description}
          />
        </Card>
        <Card className="p-4 mb-4">
          <EventSectionTitle step={3} title={t("create.event.sections.location")} />
          <CountryPicker value={country} onChange={setCountry} error={errors.country} />
          <Input label={`${t("create.event.city")} *`} value={city} onChangeText={setCity} error={errors.city} placeholder={t("create.event.city")} />
          <View className="mt-4" />
          <Input
            label={t("create.event.exactAddress")}
            value={venueAddress}
            onChangeText={setVenueAddress}
            placeholder={t("create.event.exactAddressPlaceholder")}
            testID="event-exact-address"
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
            testID="event-postal-code"
          />
        </Card>
        <Card className="p-4 mb-4">
          <EventSectionTitle step={4} title={t("create.event.sections.participation")} />
          <EventHostingSelector
            value={hosting}
            onChange={setHosting}
            link={registrationUrl}
            onChangeLink={(v) => { setRegistrationUrl(v); setErrors((prev) => ({ ...prev, registration_url: "" })); }}
            linkError={hostingLinkError}
            disabled={createMut.isPending}
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
            testID="event-website-url"
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
            testID="event-contact-email"
          />
          <View className="mt-4" />
          <Input
            label={t("create.event.league")}
            value={league}
            onChangeText={setLeague}
            placeholder={t("create.event.leaguePlaceholder")}
            testID="event-league"
          />

          <View className="mt-4" />
          <Input
            label={t("create.event.price")}
            value={priceInput}
            onChangeText={(v) => setPriceInput(v.replace(/[^0-9.,]/g, ""))}
            keyboardType="decimal-pad"
            placeholder="0"
            help={t("create.event.priceHint")}
            rightElement={<Text className="text-base font-semibold text-neutral-500">€</Text>}
          />
          <View className="mt-4" />
          <Input
            label={t("create.event.totalSlots")}
            value={placesTotal}
            onChangeText={(v) => setPlacesTotal(v.replace(/[^0-9]/g, ""))}
            keyboardType="number-pad"
            placeholder={t("events.unlimitedIfEmpty")}
            help={t("create.event.placesHint")}
          />
        </Card>
        <Card className="p-4 mb-4">
          <EventSectionTitle step={5} title={t("create.event.sections.details")} />
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Input label={t("create.event.ageMin")} value={ageMin} onChangeText={(v) => setAgeMin(v.replace(/[^0-9]/g, ""))} keyboardType="number-pad" placeholder="—" />
            </View>
            <View className="flex-1">
              <Input label={t("create.event.ageMax")} value={ageMax} onChangeText={(v) => setAgeMax(v.replace(/[^0-9]/g, ""))} keyboardType="number-pad" placeholder="—" error={errors.age_max} />
          </View>
          </View>
        </Card>
        <Card className="p-4 mb-4">
          <EventSectionTitle step={6} title={t("create.event.sections.media")} />
          <CoverPicker
            url={coverUri}
            onPick={() => void pickCover()}
            onRemove={() => setCoverUri(null)}
            disabled={createMut.isPending}
          />
          <PhotosPicker
            uris={heroUris}
            onAdd={() => void pickHeroPhotos()}
            onChange={(i) => void replaceHero(i)}
            onRemove={(i) => removeHero(i)}
          />
        </Card>
        {!isValid && missing.length > 0 && (
          <View className="mt-1 mb-3 p-3 rounded-xl bg-neutral-100 dark:bg-neutral-800">
            <Text className="text-sm font-medium text-neutral-900 dark:text-neutral-50 mb-1">
              {t("create.event.missingFields")}
            </Text>
            {missing.map((m) => (
              <Text key={m} className="text-xs text-neutral-700 dark:text-neutral-300">• {m}</Text>
            ))}
          </View>
        )}
        <Button
          title={t("create.event.publishPublic")}
          onPress={() => createMut.mutate()}
          loading={createMut.isPending}
          disabled={!isValid}
          className="mt-2"
        />
      </ScrollView>
    </SafeScreen>
  );
}