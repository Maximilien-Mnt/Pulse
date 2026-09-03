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

  useEffect(() => {
    if (!clubId) return;
    (async () => {
      try {
        const { data, error } = await supabase.from("clubs").select("*").eq("id", clubId).single();
        if (error || !data) { setLoading(false); return; }
        setClub(data);
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
      const ext = uri.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const response = await fetch(uri);
      const blob = await response.blob();
      const { error } = await supabase.storage.from("clubs").upload(path, blob);
      if (error) throw error;
      const { data } = supabase.storage.from("clubs").getPublicUrl(path);
      return data.publicUrl;
    } catch { Toast.show({ type: "error", text1: "Image upload failed" }); return null; }
  }, []);

  const handleSave = useCallback(async () => {
    if (!name.trim() || sports.length === 0) {
      Toast.show({ type: "error", text1: "Name and at least one sport are required" });
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
      Toast.show({ type: "success", text1: "Club updated" });
      router.back();
    } catch { Toast.show({ type: "error", text1: "Could not update club" }); }
    finally { setSaving(false); }
  }, [name, shortDescription, description, sports, requiredLevels, country, city, address, postalCode, contactEmail, phoneNumber, websiteUrl, registrationUrl, league, foundedDate, ageMin, ageMax, instagramUrl, facebookUrl, tiktokUrl, extraLink, logoUrl, coverUrl, heroUrls, openingHours, clubId]);

  const [showDelete, setShowDelete] = useState(false);

  const handleDelete = useCallback(() => {
    Alert.alert("Delete club", "This will permanently delete the club, all its events, and notify all members. This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        setSaving(true);
        try {
          const { error } = await supabase.rpc("delete_club_full", {
            p_club_id: clubId,
            p_club_title: "Club deleted",
            p_club_body: `The club has been deleted by its creator.`,
            p_event_title: "Event cancelled",
            p_event_body: `The club has been deleted and all its events cancelled.`,
          });
          if (error) throw error;
          Toast.show({ type: "success", text1: "Club deleted" });
          router.replace("/(tabs)/profile/clubs");
        } catch { Toast.show({ type: "error", text1: "Could not delete club" }); setSaving(false); }
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
    <SafeScreen edges={["top"]}>
      <Stack.Screen options={{ headerShown: true, title: "", headerLeft: () => (
        <Pressable onPress={() => router.back()} className="p-2 -ml-2"><Icon name="ArrowLeft" size={24} /></Pressable>
      )}} />
      <ScrollView className="flex-1 bg-neutral-50 dark:bg-[#0A0F1E]" contentContainerClassName="px-4 pb-12" showsVerticalScrollIndicator={false}>
        <Text className="text-2xl font-bold mt-3 mb-4">Edit club</Text>

        <View className={`${CARD} p-4`}>
          <Input label={"Club name *"} value={name} onChangeText={setName} placeholder="Enter the club name" />
        </View>
        <View className="h-4" />

        <View className={`${CARD} p-4`}>
          <Input label={"Short description"} value={shortDescription} onChangeText={setShortDescription} placeholder="A short tagline (optional)" />
          <View className="h-4" />
          <Input label={"Description"} value={description} onChangeText={setDescription} placeholder="Describe your club" multiline numberOfLines={5} textAlignVertical="top" />
        </View>
        <View className="h-4" />

        <View className={`${CARD} p-4`}>
          <Text className="text-sm font-semibold text-neutral-500">Sport(s) *</Text>
          <View className="h-3" />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {SPORTS.map((sp) => (
              <Pressable key={sp.id} onPress={() => toggleSport(sp.id)} className={`px-3 py-1.5 rounded-full border ${sports.includes(sp.id) ? "bg-primary-500 border-primary-500" : "border-neutral-200 dark:border-neutral-600"}`}>
                <Text className={sports.includes(sp.id) ? "text-white text-sm" : "text-neutral-700 dark:text-neutral-200 text-sm"}>{sp.label}</Text>
              </Pressable>
            ))}
          </View>
          {sports.length > 0 && (
            <>
              <View className="h-5" />
              <Text className="text-sm font-semibold text-neutral-500">Required level per sport</Text>
              <View className="h-3" />
              {sports.map((sp) => (
                <View key={sp} className="mb-3">
                  <Text className="text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">{SPORTS.find((x) => x.id === sp)?.label ?? sp}</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                    {((SPORT_LEVELS as Record<string, string[]>)[sp] ?? ["Any"]).map((lvl: string) => (
                      <Pressable key={lvl} onPress={() => setLevelFor(sp, lvl)} className={`px-2.5 py-1 rounded-full border ${(requiredLevels[sp] ?? "Any") === lvl ? "bg-primary-500 border-primary-500" : "border-neutral-200 dark:border-neutral-600"}`}>
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
          <View className="flex-row items-center mb-3"><Icon name="MapPin" size={16} className="mr-2" /><Text className="text-base font-semibold">Location</Text></View>
          <Text className="text-sm font-semibold text-neutral-500">Country</Text>
          <View className="h-2" />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {COMMON_COUNTRIES.map((c) => (
              <Pressable key={c.code} onPress={() => setCountry(c.code)} className={`flex-row items-center px-3 py-1.5 rounded-full border ${country === c.code ? "bg-primary-500 border-primary-500" : "border-neutral-200 dark:border-neutral-600"}`}>
                <Text className="text-sm">{countryFlag(c.code)}</Text><Text className="text-sm ml-1.5">{c.label}</Text>
              </Pressable>
            ))}
          </View>
          <View className="h-4" />
          <Input label={"City"} value={city} onChangeText={setCity} placeholder="City" />
          <Input label={"Address"} value={address} onChangeText={setAddress} placeholder="Street address" />
          <Input label={"Postal code"} value={postalCode} onChangeText={setPostalCode} placeholder="Postal code" keyboardType="number-pad" />
        </View>
        <View className="h-4" />

        <View className={`${CARD} p-4`}>
          <View className="flex-row items-center mb-3"><Icon name="Mail" size={16} className="mr-2" /><Text className="text-base font-semibold">Contact & links</Text></View>
          <Input label={"Contact email"} value={contactEmail} onChangeText={setContactEmail} placeholder="email@example.com" keyboardType="email-address" autoCapitalize="none" />
          <Input label={"Phone"} value={phoneNumber} onChangeText={setPhoneNumber} placeholder="+33 6 00 00 00 00" keyboardType="phone-pad" />
          <Input label={"Website"} value={websiteUrl} onChangeText={setWebsiteUrl} placeholder="https://..." autoCapitalize="none" />
          <Input label={"External registration link"} value={registrationUrl} onChangeText={setRegistrationUrl} placeholder="https://inscription..." autoCapitalize="none" />
        </View>
        <View className="h-4" />

        <View className={`${CARD} p-4`}>
          <View className="flex-row items-center mb-3"><Icon name="Info" size={16} className="mr-2" /><Text className="text-base font-semibold">Additional info</Text></View>
          <Input label={"League / Division"} value={league} onChangeText={setLeague} placeholder="e.g. Ligue 1, Regional" />
          <Input label={"Foundation year"} value={foundedDate} onChangeText={setFoundedDate} placeholder="YYYY" keyboardType="number-pad" />
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}><Input label={"Min age"} value={ageMin} onChangeText={setAgeMin} placeholder="16" keyboardType="number-pad" /></View>
            <View style={{ flex: 1 }}><Input label={"Max age"} value={ageMax} onChangeText={setAgeMax} placeholder="99" keyboardType="number-pad" /></View>
          </View>
        </View>
        <View className="h-4" />

        <View className={`${CARD} p-4`}>
          <View className="flex-row items-center mb-3"><Icon name="Share2" size={16} className="mr-2" /><Text className="text-base font-semibold">Social networks</Text></View>
          <Input label={"Instagram"} value={instagramUrl} onChangeText={setInstagramUrl} placeholder="https://instagram.com/..." autoCapitalize="none" />
          <Input label={"Facebook"} value={facebookUrl} onChangeText={setFacebookUrl} placeholder="https://facebook.com/..." autoCapitalize="none" />
          <Input label={"TikTok"} value={tiktokUrl} onChangeText={setTiktokUrl} placeholder="https://tiktok.com/..." autoCapitalize="none" />
          <Input label={"Additional link"} value={extraLink} onChangeText={setExtraLink} placeholder="https://..." autoCapitalize="none" />
        </View>
        <View className="h-4" />

        <View className={`${CARD} p-4`}>
          <View className="flex-row items-center mb-3"><Icon name="Image" size={16} className="mr-2" /><Text className="text-base font-semibold">Photos & media</Text></View>
          <Pressable onPress={async () => { const u = await pickImage({}) as string | null; if (u) { const url = await uploadImage(u, "logos"); if (url) setLogoUrl(url); } }} className="flex-row items-center p-3 rounded-xl border border-neutral-200 dark:border-neutral-700 mb-3">
            {logoUrl ? <Image source={{ uri: logoUrl }} className="w-16 h-16 rounded-full mr-3" /> : <View className="w-16 h-16 rounded-full mr-3 bg-neutral-200 dark:bg-neutral-700 items-center justify-center"><Icon name="Image" size={20} /></View>}
            <Text className="text-sm text-neutral-500">Club logo</Text>
          </Pressable>
          <Pressable onPress={async () => { const u = await pickImage({}) as string | null; if (u) { const url = await uploadImage(u, "covers"); if (url) setCoverUrl(url); } }} className="flex-row items-center p-3 rounded-xl border border-neutral-200 dark:border-neutral-700 mb-3">
            {coverUrl ? <Image source={{ uri: coverUrl }} className="w-20 h-12 rounded-lg mr-3" /> : <View className="w-20 h-12 rounded-lg mr-3 bg-neutral-200 dark:bg-neutral-700 items-center justify-center"><Icon name="Image" size={20} /></View>}
            <Text className="text-sm text-neutral-500">Cover image</Text>
          </Pressable>
          <Text className="text-xs text-neutral-500 mb-2">Club photos ({heroUrls.length}/10)</Text>
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
          <View className="flex-row items-center mb-3"><Icon name="Clock" size={16} className="mr-2" /><Text className="text-base font-semibold">Opening hours</Text></View>
          <ClubOpeningHoursEditor value={openingHours} onChange={setOpeningHours} />
        </View>
        <View className="h-6" />

        <Button title={t("common.save")} onPress={handleSave} loading={saving} disabled={saving || sports.length === 0 || !name.trim()} />
        <View className="h-4" />
        <Button title={"Delete club"} onPress={() => setShowDelete(true)} variant="ghost" className="border-red-500" disabled={saving} />
        <View className="h-6" />
      </ScrollView>

      {showDelete && (
        <View className="absolute inset-0 bg-black/50 items-center justify-center px-6">
          <View className={`${CARD} p-6 w-full max-w-sm`}>
            <Text className="text-lg font-bold mb-2">Delete club</Text>
            <Text className="text-sm text-neutral-500 mb-4">This will permanently delete the club, all its events, and notify all members. This cannot be undone.</Text>
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
