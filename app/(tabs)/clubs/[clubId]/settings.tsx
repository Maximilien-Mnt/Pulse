import React, { useCallback, useEffect, useState } from "react";
import { ScrollView, View, Image, Pressable, Alert, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { SafeScreen } from "@/components/shared/SafeScreen";
import Toast from "react-native-toast-message";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { SPORTS, SPORT_LEVELS } from "@/lib/constants";
import { COMMON_COUNTRIES, countryFlag } from "@/utils/countries";
import { Button } from "@/components/ui/Button";
import { BackButton } from "@/components/ui/BackButton";
import { Input } from "@/components/ui/Input";
import { Text } from "@/components/ui/Text";
import { Icon } from "@/components/ui/Icon";
import type { Club } from "@/types";
import type { OpeningHourSlot } from "@/lib/openingHours";
import { ClubOpeningHoursEditor } from "@/components/clubs/ClubOpeningHours";
import { t } from "@/hooks/useTranslation";

const CARD = "rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800";

export default function ClubSettings() {
  const { clubId } = useLocalSearchParams<{ clubId: string }>();
  const router = useRouter();
  const userId = useAuthStore((s) => s.userId);
  const [club, setClub] = useState<Club | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [name, setName] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");
  const [sports, setSports] = useState<string[]>([]);
  const [requiredLevels, setRequiredLevels] = useState<Record<string, string>>({});
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [registrationUrl, setRegistrationUrl] = useState("");
  const [league, setLeague] = useState("");
  const [foundedDate, setFoundedDate] = useState("");
  const [ageMin, setAgeMin] = useState("");
  const [ageMax, setAgeMax] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [heroUrls, setHeroUrls] = useState<string[]>([]);
  const [openingHours, setOpeningHours] = useState<OpeningHourSlot[]>([]);
  const [instagramUrl, setInstagramUrl] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [tiktokUrl, setTiktokUrl] = useState("");
  const [extraLink, setExtraLink] = useState("");
  const [initialized, setInitialized] = useState(false);

  const isAdmin = !!userId && club?.created_by === userId;

  useEffect(() => {
    if (!clubId) return;
    (async () => {
      try {
        const { data, error } = await supabase.from("clubs").select("*").eq("id", clubId).single();
        if (error || !data) { setLoading(false); return; }
        setClub(data);
        // Settings are admin-only: bounce non-admins back to the club page.
        if (!userId || data.created_by !== userId) {
          Toast.show({ type: "error", text1: t("clubs.settings.adminOnly") });
          router.replace(`/(tabs)/clubs/${clubId}`);
          return;
        }
        setName(data.name || "");
        setShortDescription((data as any).short_description || "");
        setDescription(data.description || "");
        setSports(Array.isArray((data as any).sports) ? (data as any).sports : (data.sport ? [data.sport] : []));
        setRequiredLevels((data as any).required_levels || {});
        setCountry(data.country || "");
        setCity(data.city || "");
        setAddress((data as any).address || "");
        setPostalCode((data as any).postal_code || "");
        setContactEmail(data.contact_email || "");
        setPhoneNumber((data as any).phone_number || "");
        setWebsiteUrl(data.website_url || "");
        setRegistrationUrl((data as any).registration_url || "");
        setLeague(data.league || "");
        setFoundedDate(data.founded_date || "");
        setAgeMin(data.age_min != null ? String(data.age_min) : "");
        setAgeMax(data.age_max != null ? String(data.age_max) : "");
        setLogoUrl(data.logo_url || "");
        setCoverUrl(data.cover_url || "");
        setHeroUrls(Array.isArray(data.hero_urls) ? data.hero_urls : []);
        setOpeningHours(Array.isArray((data as any).opening_hours) ? (data as any).opening_hours : []);
        setInstagramUrl((data as any).instagram_url || "");
        setFacebookUrl((data as any).facebook_url || "");
        setTiktokUrl((data as any).tiktok_url || "");
        setExtraLink((data as any).extra_link || "");
      } catch { } finally { setLoading(false); setHydrated(true); setInitialized(true); }
    })();
  }, [clubId]);

  const toggleSport = useCallback((sp: string) => {
    setSports((prev) => prev.includes(sp) ? prev.filter((x) => x !== sp) : [...prev, sp]);
  }, []);

  const setLevelFor = useCallback((sport: string, value: string) => {
    setRequiredLevels((prev) => {
      const copy = { ...prev };
      if (value === "any") delete copy[sport];
      else copy[sport] = value;
      return copy;
    });
  }, []);

  const pickImage = useCallback(async (opts: { multiple?: boolean }) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Toast.show({ type: "error", text1: t("error.permissionPhotos") }); return null; }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8,
      allowsMultipleSelection: opts.multiple ?? false,
    });
    if (res.canceled) return null;
    const uris = res.assets.map((art) => art.uri);
    return opts.multiple ? uris : (uris[0] ?? null);
  }, []);

  const uploadImage = useCallback(async (uri: string, folder: string): Promise<string | null> => {
    try {
      if (!userId) throw new Error("not authenticated");
      // RLS on the "clubs" bucket requires the first path segment to be the
      // uploader's user id. The file name is also always rebuilt from the blob
      // MIME type because the picker URI may be a blob:/http: URL on web.
      const response = await fetch(uri);
      const blob = await response.blob();
      const mime = blob.type || "image/jpeg";
      const ext = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : mime.includes("gif") ? "gif" : mime.includes("heic") ? "heic" : "jpg";
      const path = `${userId}/${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("clubs").upload(path, blob, { contentType: mime });
      if (error) throw error;
      const { data } = supabase.storage.from("clubs").getPublicUrl(path);
      return data.publicUrl;
    } catch { Toast.show({ type: "error", text1: t("clubs.settings.uploadFailed") }); return null; }
  }, [userId]);

  const handleSave = useCallback(async () => {
    if (!name.trim() || sports.length === 0) {
      Toast.show({ type: "error", text1: t("clubs.settings.nameSportRequired") });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("clubs")
        .update({
          name: name.trim(),
          short_description: shortDescription.trim() || undefined,
          description: description.trim() || undefined,
          sports,
          sport: sports[0] || undefined,
          required_levels: requiredLevels,
          required_level: (sports[0] ? requiredLevels[sports[0]] : undefined) || "any",
          country: country.trim() || undefined,
          city: city.trim() || undefined,
          address: address.trim() || undefined,
          postal_code: postalCode.trim() || undefined,
          contact_email: contactEmail.trim() || undefined,
          phone_number: phoneNumber.trim() || undefined,
          website_url: websiteUrl.trim() || undefined,
          registration_url: registrationUrl.trim() || undefined,
          league: league.trim() || undefined,
          founded_date: foundedDate.trim() || undefined,
          age_min: ageMin ? parseInt(ageMin, 10) : null,
          age_max: ageMax ? parseInt(ageMax, 10) : null,
          instagram_url: instagramUrl.trim() || undefined,
          facebook_url: facebookUrl.trim() || undefined,
          tiktok_url: tiktokUrl.trim() || undefined,
          extra_link: extraLink.trim() || undefined,
          logo_url: logoUrl || undefined,
          cover_url: coverUrl || undefined,
          hero_urls: heroUrls,
          opening_hours: openingHours,
        })
        .eq("id", clubId);
      if (error) throw error;
      Toast.show({ type: "success", text1: t("clubs.settings.updated") });
      router.replace(`/(tabs)/clubs/${clubId}/dashboard`);
    } catch { Toast.show({ type: "error", text1: t("clubs.settings.updateFailed") }); }
    finally { setSaving(false); }
  }, [name, shortDescription, description, sports, requiredLevels, country, city, address, postalCode, contactEmail, phoneNumber, websiteUrl, registrationUrl, league, foundedDate, ageMin, ageMax, instagramUrl, facebookUrl, tiktokUrl, extraLink, logoUrl, coverUrl, heroUrls, openingHours, clubId]);

  const [showDelete, setShowDelete] = useState(false);

  const handleDelete = useCallback(() => {
    Alert.alert(t("clubs.dashboard.deleteClub"), t("clubs.settings.deleteBody"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("common.delete"), style: "destructive", onPress: async () => {
        setSaving(true);
        try {
          const { error } = await supabase.rpc("delete_club_full", {
            p_club_id: clubId,
            p_club_title: t("clubs.settings.deleteNotifyClubTitle"),
            p_club_body: t("clubs.settings.deleteNotifyClubBody"),
            p_event_title: t("clubs.settings.deleteNotifyEventTitle"),
            p_event_body: t("clubs.settings.deleteNotifyEventBody"),
          });
          if (error) throw error;
          Toast.show({ type: "success", text1: t("clubs.deleted") });
          router.replace("/(tabs)/profile");
        } catch { Toast.show({ type: "error", text1: t("clubs.deleteFailed") }); setSaving(false); }
      }},
    ]);
  }, [clubId]);

  if (loading || !hydrated) {
    return (
      <SafeScreen edges={["top"]}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" />
        </View>
      </SafeScreen>
    );
  }

  return (
    <SafeScreen className="flex-1 bg-neutral-50 dark:bg-[#0A0F1E]" edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      {/* Header: back arrow + centered title, matching the app's default headers */}
      <View className="flex-row items-center gap-3 px-3 py-2">
        <BackButton
          useInAppSession
          fallbackRoute={isAdmin ? "/(tabs)/clubs" : `/(tabs)/clubs/${clubId}`}
        />
        <Text variant="h2" className="flex-1 text-center" numberOfLines={1}>
          {t("clubs.settings.editTitle")}
        </Text>
      </View>
      <ScrollView className="flex-1" contentContainerClassName="px-4 pb-12" showsVerticalScrollIndicator={false}>

        <View className={`${CARD} p-4`}>
          <Input label={t("clubs.settings.clubName")} value={name} onChangeText={setName} placeholder={t("clubs.settings.clubNamePlaceholder")} />
        </View>
        <View className="h-4" />

        <View className={`${CARD} p-4`}>
          <Input label={t("clubs.settings.shortDescription")} value={shortDescription} onChangeText={setShortDescription} placeholder={t("clubs.settings.shortDescriptionPlaceholder")} />
          <View className="h-4" />
          <Input label={t("clubs.settings.description")} value={description} onChangeText={setDescription} placeholder={t("clubs.settings.descriptionPlaceholder")} multiline numberOfLines={5} textAlignVertical="top" />
        </View>
        <View className="h-4" />

        <View className={`${CARD} p-4`}>
          <Text className="text-sm font-semibold text-neutral-500">{t("clubs.settings.sportsLabel")}</Text>
          <View className="h-3" />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {SPORTS.map((sp) => (
              <Pressable key={sp.id} onPress={() => toggleSport(sp.id)} className={`px-3 py-1.5 rounded-full border ${sports.includes(sp.id) ? "bg-primary border-primary" : "border-primary"}`}>
                <Text className={sports.includes(sp.id) ? "text-white text-sm" : "text-neutral-700 dark:text-neutral-200 text-sm"}>{sp.label}</Text>
              </Pressable>
            ))}
          </View>
          {sports.length > 0 && (
            <>
              <View className="h-5" />
              <Text className="text-sm font-semibold text-neutral-500">{t("clubs.settings.requiredLevelPerSport")}</Text>
              <View className="h-3" />
              {sports.map((sp) => (
                <View key={sp} className="mb-3">
                  <Text className="text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">{SPORTS.find((x) => x.id === sp)?.label ?? sp}</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                    {((SPORT_LEVELS as Record<string, string[]>)[sp] ?? ["Any"]).map((lvl: string) => (
                      <Pressable key={lvl} onPress={() => setLevelFor(sp, lvl)} className={`px-2.5 py-1 rounded-full border ${(requiredLevels[sp] ?? "Any") === lvl ? "bg-primary border-primary" : "border-primary"}`}>
                        <Text className={`text-xs ${(requiredLevels[sp] ?? "Any") === lvl ? "text-white" : "text-neutral-700 dark:text-neutral-300"}`}>{lvl}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ))}
            </>
          )}
        </View>
        <View className="h-4" />

        <View className={`${CARD} p-4`}>
          <View className="flex-row items-center mb-3"><Icon name="MapPin" size={16} className="mr-2" /><Text className="text-base font-semibold">{t("clubs.settings.location")}</Text></View>
          <Text className="text-sm font-semibold text-neutral-500">{t("clubs.settings.country")}</Text>
          <View className="h-2" />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {COMMON_COUNTRIES.map((c) => (
              <Pressable key={c.code} onPress={() => setCountry(c.code)} className={`flex-row items-center px-3 py-1.5 rounded-full border ${country === c.code ? "bg-primary border-primary" : "border-primary"}`}>
                <Text className={`text-sm ${country === c.code ? "text-white" : "text-neutral-700 dark:text-neutral-200"}`}>{countryFlag(c.code)}</Text><Text className={`text-sm ml-1.5 ${country === c.code ? "text-white" : "text-neutral-700 dark:text-neutral-200"}`}>{c.label}</Text>
              </Pressable>
            ))}
          </View>
          <View className="h-4" />
          <Input label={t("clubs.settings.city")} value={city} onChangeText={setCity} placeholder={t("clubs.settings.city")} />
          <Input label={t("clubs.settings.address")} value={address} onChangeText={setAddress} placeholder={t("clubs.settings.address")} />
          <Input label={t("clubs.settings.postalCode")} value={postalCode} onChangeText={setPostalCode} placeholder={t("clubs.settings.postalCode")} keyboardType="number-pad" />
        </View>
        <View className="h-4" />

        <View className={`${CARD} p-4`}>
          <View className="flex-row items-center mb-3"><Icon name="Mail" size={16} className="mr-2" /><Text className="text-base font-semibold">{t("clubs.settings.contactLinks")}</Text></View>
          <Input label={t("clubs.dashboard.contactEmail")} value={contactEmail} onChangeText={setContactEmail} placeholder="email@example.com" keyboardType="email-address" autoCapitalize="none" />
          <Input label={t("clubs.settings.phone")} value={phoneNumber} onChangeText={setPhoneNumber} placeholder="+33 6 00 00 00 00" keyboardType="phone-pad" />
          <Input label={t("clubs.settings.website")} value={websiteUrl} onChangeText={setWebsiteUrl} placeholder="https://..." autoCapitalize="none" />
          <Input label={t("clubs.settings.registrationLink")} value={registrationUrl} onChangeText={setRegistrationUrl} placeholder="https://inscription..." autoCapitalize="none" />
        </View>
        <View className="h-4" />

        <View className={`${CARD} p-4`}>
          <View className="flex-row items-center mb-3"><Icon name="Info" size={16} className="mr-2" /><Text className="text-base font-semibold">{t("clubs.settings.additionalInfo")}</Text></View>
          <Input label={t("clubs.settings.league")} value={league} onChangeText={setLeague} placeholder={t("clubs.settings.leaguePlaceholder")} />
          <Input label={t("clubs.settings.foundedYear")} value={foundedDate} onChangeText={setFoundedDate} placeholder={t("clubs.settings.foundedYearPlaceholder")} keyboardType="number-pad" />
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}><Input label={t("clubs.settings.minAge")} value={ageMin} onChangeText={setAgeMin} placeholder="16" keyboardType="number-pad" /></View>
            <View style={{ flex: 1 }}><Input label={t("clubs.settings.maxAge")} value={ageMax} onChangeText={setAgeMax} placeholder="99" keyboardType="number-pad" /></View>
          </View>
        </View>
        <View className="h-4" />

        <View className={`${CARD} p-4`}>
          <View className="flex-row items-center mb-3"><Icon name="Share2" size={16} className="mr-2" /><Text className="text-base font-semibold">{t("clubs.settings.socialNetworks")}</Text></View>
          <Input label={"Instagram"} value={instagramUrl} onChangeText={setInstagramUrl} placeholder="https://instagram.com/..." autoCapitalize="none" />
          <Input label={"Facebook"} value={facebookUrl} onChangeText={setFacebookUrl} placeholder="https://facebook.com/..." autoCapitalize="none" />
          <Input label={"TikTok"} value={tiktokUrl} onChangeText={setTiktokUrl} placeholder="https://tiktok.com/..." autoCapitalize="none" />
          <Input label={t("clubs.settings.additionalLink")} value={extraLink} onChangeText={setExtraLink} placeholder="https://..." autoCapitalize="none" />
        </View>
        <View className="h-4" />

        <View className={`${CARD} p-4`}>
          <View className="flex-row items-center mb-3"><Icon name="Image" size={16} className="mr-2" /><Text className="text-base font-semibold">{t("clubs.settings.photosMedia")}</Text></View>
          <Pressable onPress={async () => { const u = await pickImage({}) as string | null; if (u) { const url = await uploadImage(u, "logos"); if (url) setLogoUrl(url); } }} className="flex-row items-center p-3 rounded-xl border border-neutral-200 dark:border-neutral-700 mb-3">
            {logoUrl ? <Image source={{ uri: logoUrl }} className="w-16 h-16 rounded-full mr-3" /> : <View className="w-16 h-16 rounded-full mr-3 bg-neutral-200 dark:bg-neutral-700 items-center justify-center"><Icon name="Image" size={20} /></View>}
            <Text className="text-sm text-neutral-500">{t("clubs.settings.clubLogo")}</Text>
          </Pressable>
          <Pressable onPress={async () => { const u = await pickImage({}) as string | null; if (u) { const url = await uploadImage(u, "covers"); if (url) setCoverUrl(url); } }} className="flex-row items-center p-3 rounded-xl border border-neutral-200 dark:border-neutral-700 mb-3">
            {coverUrl ? <Image source={{ uri: coverUrl }} className="w-20 h-12 rounded-lg mr-3" /> : <View className="w-20 h-12 rounded-lg mr-3 bg-neutral-200 dark:bg-neutral-700 items-center justify-center"><Icon name="Image" size={20} /></View>}
            <Text className="text-sm text-neutral-500">{t("clubs.settings.coverImage")}</Text>
          </Pressable>
          <Text className="text-xs text-neutral-500 mb-2">{t("clubs.settings.clubPhotos", { count: heroUrls.length })}</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {heroUrls.map((uri, i) => (
              <View key={i} className="relative"><Image source={{ uri }} className="w-20 h-20 rounded-lg" />
                <Pressable onPress={() => setHeroUrls((prev) => prev.filter((_, idx) => idx !== i))} className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 items-center justify-center"><Text className="text-xs text-white">x</Text></Pressable>
              </View>
            ))}
            {heroUrls.length < 10 && (
              <Pressable onPress={async () => { const usResult = await pickImage({ multiple: true });
              const us = (Array.isArray(usResult) ? usResult : []) as string[]; if (us && us.length > 0) { const uploaded = await Promise.all(us.slice(0, 10 - heroUrls.length).map((u) => uploadImage(u, "hero"))); setHeroUrls((prev) => [...prev, ...uploaded.filter(Boolean) as string[]]); } }} className="w-20 h-20 rounded-lg border border-dashed border-neutral-300 dark:border-neutral-600 items-center justify-center">
                <Icon name="Plus" size={20} />
              </Pressable>
            )}
          </View>
        </View>
        <View className="h-4" />

        <View className={`${CARD} p-4`}>
          <View className="flex-row items-center mb-3"><Icon name="Clock" size={16} className="mr-2" /><Text className="text-base font-semibold">{t("clubs.hours.title")}</Text></View>
          <ClubOpeningHoursEditor value={openingHours} onChange={setOpeningHours} />
        </View>
        <View className="h-6" />

        <Button title={t("common.save")} onPress={handleSave} loading={saving} disabled={saving || sports.length === 0 || !name.trim()} />
        <View className="h-4" />
        <Button title={t("clubs.dashboard.deleteClub")} onPress={() => setShowDelete(true)} variant="destructive" disabled={saving} />
        <View className="h-6" />
      </ScrollView>

      {showDelete && (
        <View className="absolute inset-0 bg-black/50 items-center justify-center px-6">
          <View className={`${CARD} p-6 w-full max-w-sm`}>
            <Text className="text-lg font-bold mb-2">{t("clubs.dashboard.deleteClub")}</Text>
            <Text className="text-sm text-neutral-500 mb-4">{t("clubs.settings.deleteBody")}</Text>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}><Button title={t("common.cancel")} onPress={() => setShowDelete(false)} variant="ghost" /></View>
              <View style={{ flex: 1 }}><Button title={t("common.delete")} onPress={handleDelete} loading={saving} disabled={saving} className="border-red-500 bg-red-500" /></View>
            </View>
          </View>
        </View>
      )}
    </SafeScreen>
  );
}
