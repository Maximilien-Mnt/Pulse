import { EventIdentitySelector } from "@/components/events/EventIdentitySelector";
import { useEventPublishingIdentity } from "@/hooks/useEventPublishingIdentity";
import { BackButton } from "@/components/ui/BackButton";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { COMMON_COUNTRIES, countryFlag } from "@/utils/countries";
import { EVENT_CATEGORIES, SPORTS } from "@/lib/constants";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { eventPublicSchema } from "@/utils/validation";
import { localizeError } from "@/utils/localizeError";
import { uploadImageToStorage } from "@/lib/imageUpload";
import type { MediaRole } from "@/lib/mediaPipeline";
import * as ImagePicker from "expo-image-picker";
import { Icon } from "@/components/ui/Icon";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useState, useEffect } from "react";
import { Image } from "expo-image";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeScreen } from "@/components/shared/SafeScreen";
import Toast from "react-native-toast-message";
import { useMutation, useQuery } from "@tanstack/react-query";
import { NativeDateField } from "@/components/ui/NativeDateField";
import Slider from "@react-native-community/slider";
import { useKeyboardHeight } from "@/lib/keyboardUtils";
import { t } from "@/hooks/useTranslation";

async function uploadImage(uri: string, path: string, role: MediaRole = "gallery") {
  return uploadImageToStorage({ bucket: "events", path, uri, upsert: true, role });
}

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

  const [sport, setSport] = useState("");
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
  const [registrationUrl, setRegistrationUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [priceInput, setPriceInput] = useState("");
  const [requiredLevel, setRequiredLevel] = useState("");
  const [difficulty, setDifficulty] = useState(3);
  const [category, setCategory] = useState("");
  const [placesTotal, setPlacesTotal] = useState("");
  const [startDate, setStartDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)); // +7 days
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [endDateError, setEndDateError] = useState("");
  const [heroUris, setHeroUris] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Club deep links are validated against the authorized publishing identities.

  const pickHeroPhotos = async () => {
    const p = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!p.granted) return;
    const remaining = 5 - heroUris.length;
    if (remaining <= 0) {
      Toast.show({ type: "info", text1: "Maximum 5 photos" });
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
      setHeroUris((prev) => [...prev, ...newUris].slice(0, 5));
    }
  };

  const removeHero = (index: number) => {
    setHeroUris((prev) => prev.filter((_, i) => i !== index));
  };

  const createMut = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("auth");
      if (!identity.isValid) throw new Error(t("create.event.identityError"));
      if (!clubId && !profile?.is_public_profile) throw new Error(t("create.event.activatePublicHint"));

      const priceCents = Math.round((parseFloat(priceInput) || 0) * 100);

      const data = {
        name,
        sport,
        description,
        country,
        city,
        registration_url: registrationUrl,
        venue_address: venueAddress,
        price_cents: priceCents,
        required_level: requiredLevel,
        difficulty,
        category,
        age_min: undefined,
        age_max: undefined,
        places_total: placesTotal ? parseInt(placesTotal) : undefined,
        club_id: clubId || undefined,
        website_url: websiteUrl,
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

      // Upload hero photos
      const heroUrls: string[] = [];
      for (let i = 0; i < heroUris.length; i++) {
        const url = await uploadImage(heroUris[i]!, `${userId}/${Date.now()}_hero_${i}.jpg`, "gallery");
        heroUrls.push(url);
      }

      // Create event
      const { data: event, error: eventErr } = await supabase
        .from("events")
        .insert({
          name: name.trim(),
          sport,
          description: description.trim(),
          short_description: description.trim().slice(0, 100),
          country,
          city,
          venue_address: venueAddress || null,
          registration_url: registrationUrl || null,
          website_url: websiteUrl || null,
          price_cents: priceCents,
          is_paid: priceCents > 0,
          required_level: requiredLevel || null,
          difficulty,
          category: category || null,
          places_total: placesTotal ? parseInt(placesTotal) : null,
          places_left: placesTotal ? parseInt(placesTotal) : null,
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

  const isValid = identity.isValid && !profileLoading && (!!clubId || !!profile?.is_public_profile) && name.trim().length > 0 && sport.length > 0 && description.length >= 50 && !!country && !!city;

  return (
    <SafeScreen className="flex-1 bg-neutral-50 dark:bg-[#0A0F1E]" edges={["top"]}>
      <View className="flex-row items-center px-4 py-3 border-b border-neutral-100 dark:border-neutral-800">
        <BackButton />
        <Text className="flex-1 text-lg font-bold text-center text-neutral-900 dark:text-neutral-50">
          Événement public
        </Text>
        <View className="w-11" />
      </View>

      <ScrollView 
        contentContainerStyle={{ paddingBottom: keyboardHeight > 0 ? keyboardHeight + 20 : 20 }}
        keyboardShouldPersistTaps="handled"
      >
        <Card className="p-4 mb-4">
          <Text className="text-sm text-neutral-500 mb-4">
            {t("create.event.publicIdentityHint")}
          </Text>

          <EventIdentitySelector profile={profile} clubs={identity.clubs} value={identity.publisherClubId}
            onChange={identity.setPublisherClubId} loading={identity.isPending} error={identity.isError}
            retry={() => { void identity.refetch(); }} disabled={createMut.isPending} />
          {!clubId && profile && !profile.is_public_profile && (
            <Text className="text-error mb-3">{t("create.event.activatePublicHint")}</Text>
          )}
          <Input
            label="Nom de l'événement *"
            value={name}
            onChangeText={setName}
            error={errors.name}
            placeholder={t("create.event.example")}
          />

          <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2 mt-4">
            Sport *
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
            {SPORTS.map((s) => (
              <Pressable
                key={s.id}
                onPress={() => setSport(s.id)}
                className={`px-4 py-2 rounded-full mr-2 ${
                  sport === s.id ? "bg-primary" : "bg-neutral-200 dark:bg-neutral-800"
                }`}
              >
                <Text
                  className={sport === s.id ? "text-white font-medium" : "text-neutral-700 dark:text-neutral-200"}
                >
                  {s.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          {errors.sport && <Text className="text-error text-sm mb-2">{errors.sport}</Text>}

          <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2 mt-4">
            Date de début *
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
            title="Date de début"
            confirmLabel={t("common.ok")}
            cancelLabel={t("common.cancel")}
            renderTrigger={() => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Date de début"
                className="border border-neutral-300 dark:border-neutral-700 rounded-xl px-4 py-3 mb-4"
              >
                <Text className="text-neutral-900 dark:text-neutral-50">{formatEventDateTime(startDate)}</Text>
              </Pressable>
            )}
          />

          <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Date de fin
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
            title="Date de fin"
            confirmLabel={t("common.ok")}
            cancelLabel={t("common.cancel")}
            renderTrigger={() => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Date de fin"
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

          <Input
            label={t("create.event.description")}
            value={description}
            onChangeText={setDescription}
            multiline
            error={errors.description}
            placeholder={t("create.event.descriptionPlaceholder")}
          />
          <Text className="text-xs text-neutral-500">
            {description.length < 50
              ? `Encore ${50 - description.length} caractères requis`
              : "Longueur minimale atteinte"}
          </Text>

          <View className="flex-row gap-3 mt-4">
            <View className="flex-1">
              <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Pays *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {COMMON_COUNTRIES.map((c) => (
                  <Pressable
                    key={c.code}
                    onPress={() => setCountry(c.code)}
                    className={`px-3 py-2 rounded-full mr-2 ${
                      country === c.code ? "bg-primary" : "bg-neutral-200 dark:bg-neutral-800"
                    }`}
                  >
                    <Text
                      className={
                        country === c.code
                          ? "text-white font-medium text-sm"
                          : "text-neutral-700 dark:text-neutral-200 text-sm"
                      }
                    >
                      {countryFlag(c.code)} {c.label}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
              {!country && <Text className="text-error text-xs mt-1">{t("create.event.countryPlaceholder")}</Text>}
            </View>
          </View>

          {(errors.country || !country) && (
            <Text className="text-error text-xs mt-1 mb-2">{errors.country || t("create.event.countryRequired")}</Text>
          )}
          <Input label={t("create.event.city")} value={city} onChangeText={setCity} error={errors.city} />
          <Input label={t("create.event.venueAddress")} value={venueAddress} onChangeText={setVenueAddress} />
          <Input
            label={t("create.event.registrationUrl")}
            value={registrationUrl}
            onChangeText={setRegistrationUrl}
            placeholder="https://"
            autoCapitalize="none"
          />
          <Input
            label={t("create.event.websiteUrl")}
            value={websiteUrl}
            onChangeText={setWebsiteUrl}
            placeholder="https://"
            autoCapitalize="none"
          />

          <Input
            label={t("create.event.priceCents")}
            value={priceInput}
            onChangeText={setPriceInput}
            keyboardType="decimal-pad"
            placeholder="0"
          />

          <Input label={t("create.event.requiredLevel")} value={requiredLevel} onChangeText={setRequiredLevel} />

          <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            {t("create.event.difficulty", { difficulty })}
          </Text>
          <View className="flex-row items-center gap-3 mb-4">
            <Slider
              style={{ flex: 1, height: 40 }}
              minimumValue={1}
              maximumValue={5}
              step={1}
              value={difficulty}
              onValueChange={(v) => setDifficulty(Math.round(v))}
              minimumTrackTintColor="#1E6BFF"
              maximumTrackTintColor="#CBD5E1"
            />
            <Text className="w-8 text-right text-neutral-900 dark:text-neutral-50">{difficulty}</Text>
          </View>

          <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            {t("create.event.category")}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
            {EVENT_CATEGORIES.map((cat) => (
              <Pressable
                key={cat}
                onPress={() => setCategory(category === cat ? "" : cat)}
                className={`px-4 py-2 rounded-full mr-2 ${
                  category === cat ? "bg-primary" : "bg-neutral-200 dark:bg-neutral-800"
                }`}
              >
                <Text
                  className={category === cat ? "text-white font-medium" : "text-neutral-700 dark:text-neutral-200"}
                >
                  {cat}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <Input
            label={t("create.event.totalSlots")}
            value={placesTotal}
            onChangeText={setPlacesTotal}
            keyboardType="numeric"
            placeholder={t("events.unlimitedIfEmpty")}
          />

          {!isValid && (
            <View className="mt-3 p-3 rounded-xl bg-neutral-100 dark:bg-neutral-800">
              <Text className="text-sm font-medium text-neutral-900 dark:text-neutral-50 mb-1">
                Champs requis manquants :
              </Text>
              <Text className="text-xs text-neutral-700 dark:text-neutral-300">
                {name.trim().length === 0 && "• Nom de l'événement\n"}
                {sport.length === 0 && "• Sport\n"}
                {description.length < 50 && `• ${t("create.event.descriptionMin")}\n`}
                {!country && "• Pays\n"}
                {!city && "• Ville"}
              </Text>
            </View>
          )}
        </Card>

        <Card className="p-4 mb-4">
          <Text className="text-lg font-semibold mb-3">Photos</Text>

          <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Photos ({heroUris.length}/5)
          </Text>
          <Button title="Ajouter des photos" variant="secondary" onPress={pickHeroPhotos} />
          {heroUris.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3">
              {heroUris.map((uri, i) => (
                <View key={uri} className="mr-2 relative">
                  <Image source={{ uri }} style={{ width: 80, height: 80, borderRadius: 12 }} contentFit="cover" cachePolicy="memory-disk" transition={200} />
                  <Pressable
                    onPress={() => removeHero(i)}
                    className="absolute -top-2 -right-2 bg-error rounded-full p-1"
                  >
                    <Icon name="X" size={12} color="white" />
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          )}
        </Card>

        <Button
          title="Publier l'événement"
          onPress={() => createMut.mutate()}
          loading={createMut.isPending}
          disabled={!isValid}
          className="mt-4"
        />
      </ScrollView>
    </SafeScreen>
  );
}