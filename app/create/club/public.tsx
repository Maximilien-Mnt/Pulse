import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Icon } from "@/components/ui/Icon";
import { COMMON_COUNTRIES, countryFlag } from "@/utils/countries";
import { SPORTS, SPORT_LEVELS } from "@/lib/constants";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { clubPublicSchema } from "@/utils/validation";
import { uploadImageToStorage } from "@/lib/imageUpload";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import { Image } from "expo-image";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeScreen } from "@/components/shared/SafeScreen";
import Toast from "react-native-toast-message";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useKeyboardHeight } from "@/lib/keyboardUtils";
import { BackButton } from "@/components/ui/BackButton";
import { t } from "@/hooks/useTranslation";
import { ClubOpeningHoursEditor } from "@/components/clubs/ClubOpeningHours";
import type { OpeningHourSlot } from "@/lib/openingHours";

async function uploadImage(uri: string, path: string) {
  return uploadImageToStorage({ bucket: "clubs", path, uri });
}

export default function CreatePublicClubScreen() {
  const router = useRouter();
  const userId = useAuthStore((s) => s.userId);
  const keyboardHeight = useKeyboardHeight();

  const { data: profile } = useQuery({
    queryKey: ["profile", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", userId!).single();
      return data;
    },
  });

  // Guard: redirect if no public profile
  if (profile && !profile.is_public_profile) {
    Toast.show({
      type: "info",
      text1: t("create.club.activatePublicHint"),
    });
    router.replace("/(tabs)/profile");
    return null;
  }

  const [name, setName] = useState("");
  const [sports, setSports] = useState<string[]>([]);
  const [requiredLevels, setRequiredLevels] = useState<Record<string, string>>({});
  const [description, setDescription] = useState("");
  const [shortDescription, setShortDescription] = useState("");
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
  const [registrationUrl, setRegistrationUrl] = useState("");
  const [requiredLevel, setRequiredLevel] = useState("");
  const [address, setAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [tiktokUrl, setTiktokUrl] = useState("");
  const [extraLink, setExtraLink] = useState("");
  const [league, setLeague] = useState("");
  const [foundedDate, setFoundedDate] = useState("");
  const [openingHours, setOpeningHours] = useState<OpeningHourSlot[]>([]);
  const [heroUris, setHeroUris] = useState<string[]>([]);
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const primarySport = sports[0] ?? "";

  const toggleSport = (id: string) => {
    setSports((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  };

  const pickLogo = async () => {
    const p = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!p.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: false,
      quality: 0.8,
    });
    const first = res.assets && res.assets.length > 0 ? res.assets[0] : null;
    if (!res.canceled && first) {
      const uri = first.uri;
      setLogoUri(uri);
    }
  };

  const pickCover = async () => {
    const p = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!p.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: false,
      quality: 0.8,
    });
    const first = res.assets && res.assets.length > 0 ? res.assets[0] : null;
    if (!res.canceled && first) {
      const uri = first.uri;
      setCoverUri(uri);
    }
  };

  const pickHeroPhotos = async () => {
    const p = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!p.granted) return;
    const remaining = 10 - heroUris.length;
    if (remaining <= 0) {
      Toast.show({ type: "info", text1: "Maximum 10 photos" });
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
      setHeroUris((prev) => [...prev, ...newUris].slice(0, 10));
    }
  };

  const removeHero = (index: number) => {
    setHeroUris((prev) => prev.filter((_, i) => i !== index));
  };

  const createMut = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("auth");

      const data = {
        name,
        sport: primarySport,
        sports,
        description,
        short_description: shortDescription,
        country,
        city,
        registration_url: registrationUrl,
        required_level: requiredLevel,
        required_levels: requiredLevels,
        address,
        postal_code: postalCode,
        contact_email: contactEmail,
        phone_number: phoneNumber,
        website_url: websiteUrl,
        instagram_url: instagramUrl,
        facebook_url: facebookUrl,
        tiktok_url: tiktokUrl,
        extra_link: extraLink,
        league,
        founded_date: foundedDate,
      };

      const validation = clubPublicSchema.safeParse(data);
      if (!validation.success) {
        const errs: Record<string, string> = {};
        validation.error.errors.forEach((e) => {
          if (e.path[0]) errs[e.path[0] as string] = e.message;
        });
        setErrors(errs);
        throw new Error("Validation failed");
      }

      // Upload logo
      let logoUrl: string | null = null;
      if (logoUri) {
        logoUrl = await uploadImage(
          logoUri,
          `${userId}/${Date.now()}_logo.jpg`
        );
      }

      // Upload cover
      let coverUrl: string | null = null;
      if (coverUri) {
        coverUrl = await uploadImage(
          coverUri,
          `${userId}/${Date.now()}_cover.jpg`
        );
      }

      // Upload hero photos
      const heroUrls: string[] = [];
      for (let i = 0; i < heroUris.length; i++) {
        const url = await uploadImage(heroUris[i]!, `${userId}/${Date.now()}_hero_${i}.jpg`);
        heroUrls.push(url);
      }

      // Create club
      const { data: club, error: clubErr } = await supabase
        .from("clubs")
        .insert({
          name: name.trim(),
          sport: primarySport,
          sports,
          description: description.trim(),
          short_description: shortDescription.trim() || description.trim().slice(0, 100),
          country,
          city,
          registration_url: registrationUrl || null,
          required_level: requiredLevel || null,
          required_levels: Object.keys(requiredLevels).length > 0 ? requiredLevels : null,
          logo_url: logoUrl,
          cover_url: coverUrl,
          hero_urls: heroUrls,
          address: address || null,
          postal_code: postalCode || null,
          contact_email: contactEmail || null,
          phone_number: phoneNumber || null,
          website_url: websiteUrl || null,
          instagram_url: instagramUrl || null,
          facebook_url: facebookUrl || null,
          tiktok_url: tiktokUrl || null,
          extra_link: extraLink || null,
          league: league || null,
          founded_date: foundedDate || null,
          opening_hours: openingHours.length > 0 ? openingHours : [],
          is_private: false,
          is_external: false,
          created_by: userId,
        } as any)
        .select("id")
        .single();

      if (clubErr || !club) throw clubErr ?? new Error("club creation failed");

      // Add creator as owner
      const { error: memberErr } = await supabase.from("club_members").insert({
        club_id: club.id,
        user_id: userId,
        role: "owner",
      });
      if (memberErr) throw memberErr;

      return club.id;
    },
    onSuccess: (clubId) => {
      Toast.show({ type: "success", text1: t("create.club.publicSuccess") });
      router.replace(`/(tabs)/clubs/${clubId}`);
    },
    onError: (err) => {
      if (err instanceof Error && err.message !== "Validation failed") {
        Toast.show({ type: "error", text1: err.message });
      }
    },
  });

  const isValid = name.trim().length > 0 && primarySport.length > 0 && description.length >= 50 && country && city;

  return (
    <SafeScreen className="flex-1 bg-neutral-50 dark:bg-[#0A0F1E]" edges={["top"]}>
      <View className="flex-row items-center px-4 py-3 border-b border-neutral-100 dark:border-neutral-800">
        <BackButton />
        <Text className="flex-1 text-lg font-bold text-center text-neutral-900 dark:text-neutral-50">
          Club public
        </Text>
        <View className="w-11" />
      </View>

      <ScrollView 
        contentContainerStyle={{ paddingBottom: keyboardHeight > 0 ? keyboardHeight + 20 : 20 }}
        keyboardShouldPersistTaps="handled"
      >
        <Card className="p-4 mb-4">
          <Text className="text-sm text-neutral-500 mb-4">
            Crée un club public visible par tous. Tu dois avoir un profil public activé.
          </Text>

          <Input
            label="Nom du club *"
            value={name}
            onChangeText={setName}
            error={errors.name}
            placeholder="Ex: FC Paris Elite"
          />

          <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2 mt-4">
            Sports pratiqués (un ou plusieurs) *
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
            {SPORTS.map((s) => (
              <Pressable
                key={s.id}
                onPress={() => toggleSport(s.id)}
                className={`px-4 py-2 rounded-full mr-2 ${
                  sports.includes(s.id) ? "bg-primary" : "bg-neutral-200 dark:bg-neutral-800"
                }`}
              >
                <Text
                  className={sports.includes(s.id) ? "text-white font-medium" : "text-neutral-700 dark:text-neutral-200"}
                >
                  {s.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {sports.length > 0 && (
            <View className="mb-4">
              <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Niveau requis par sport (optionnel)
              </Text>
              {sports.map((sid) => (
                <View key={sid} className="mb-3">
                  <Text className="text-xs text-neutral-500 mb-1">
                    {SPORTS.find((sp) => sp.id === sid)?.label ?? sid}
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {(SPORT_LEVELS[sid as keyof typeof SPORT_LEVELS] ?? ["Débutant", "Intermédiaire", "Confirmé"]).map((lvl) => {
                      const active = requiredLevels[sid] === lvl;
                      return (
                        <Pressable
                          key={lvl}
                          onPress={() => setRequiredLevels((prev) => ({ ...prev, [sid]: active ? "" : lvl }))}
                          className={`px-3 py-2 rounded-full mr-2 ${
                            active ? "bg-primary" : "bg-neutral-200 dark:bg-neutral-800"
                          }`}
                        >
                          <Text
                            className={active ? "text-white font-medium text-sm" : "text-neutral-700 dark:text-neutral-200 text-sm"}
                          >
                            {lvl}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
              ))}
            </View>
          )}
          {(!primarySport) ? (
            <Text className="text-error text-sm mb-2">Sélectionne au moins un sport</Text>
          ) : null}
          {errors.sport && <Text className="text-error text-sm mb-2">{errors.sport}</Text>}

          <Input
            label="Description courte (optionnel)"
            value={shortDescription}
            onChangeText={setShortDescription}
            placeholder="Une phrase pour présenter le club"
          />

          <Input
            label={t("create.club.description")}
            value={description}
            onChangeText={setDescription}
            multiline
            error={errors.description}
            placeholder={t("create.club.descriptionPlaceholder")}
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
                        country === c.code ? "text-white font-medium text-sm" : "text-neutral-700 dark:text-neutral-200 text-sm"
                      }
                    >
                      {countryFlag(c.code)} {c.label}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
              {!country && <Text className="text-error text-xs mt-1">Sélectionne un pays</Text>}
            </View>
          </View>

          {(errors.country || !country) && (
            <Text className="text-error text-xs mt-1 mb-2">{errors.country || "Le pays est requis"}</Text>
          )}
          <Input label="Ville *" value={city} onChangeText={setCity} error={errors.city} />

          <Input
            label="Lien d'inscription/contact"
            value={registrationUrl}
            onChangeText={setRegistrationUrl}
            error={errors.registration_url}
            placeholder="https://"
            autoCapitalize="none"
          />

          <Input label="Niveau requis" value={requiredLevel} onChangeText={setRequiredLevel} placeholder={t("create.club.levelExample")} />

          <Input label="Adresse exacte" value={address} onChangeText={setAddress} />
          <Input label="Code postal (optionnel)" value={postalCode} onChangeText={setPostalCode} keyboardType="number-pad" />
          <Input
            label="Email contact"
            value={contactEmail}
            onChangeText={setContactEmail}
            error={errors.contact_email}
            placeholder="contact@exemple.com"
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <Input
            label="Téléphone (optionnel)"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            placeholder="+33 6 12 34 56 78"
            keyboardType="phone-pad"
          />
          <Input
            label="Site web"
            value={websiteUrl}
            onChangeText={setWebsiteUrl}
            error={errors.website_url}
            placeholder="https://"
            autoCapitalize="none"
          />
          <Input
            label="Instagram (optionnel)"
            value={instagramUrl}
            onChangeText={setInstagramUrl}
            placeholder="https://instagram.com/..."
            autoCapitalize="none"
          />
          <Input
            label="Facebook (optionnel)"
            value={facebookUrl}
            onChangeText={setFacebookUrl}
            placeholder="https://facebook.com/..."
            autoCapitalize="none"
          />
          <Input
            label="TikTok (optionnel)"
            value={tiktokUrl}
            onChangeText={setTiktokUrl}
            placeholder="https://tiktok.com/..."
            autoCapitalize="none"
          />
          <Input
            label="Lien supplémentaire (optionnel)"
            value={extraLink}
            onChangeText={setExtraLink}
            placeholder="https://"
            autoCapitalize="none"
          />
          <Input label="Ligue/Division" value={league} onChangeText={setLeague} />
          <Input label="Date de fondation" value={foundedDate} onChangeText={setFoundedDate} placeholder="YYYY-MM-DD" />
          {!isValid && (
            <View className="mt-3 p-3 rounded-xl bg-neutral-100 dark:bg-neutral-800">
              <Text className="text-sm font-medium text-neutral-900 dark:text-neutral-50 mb-1">
                Champs requis manquants :
              </Text>
              <Text className="text-xs text-neutral-700 dark:text-neutral-300">
                {name.trim().length === 0 && "• Nom du club\n"}
                {primarySport.length === 0 && "• Sport\n"}
                {description.length < 50 && `• ${t("create.club.descriptionMin")}\n`}
                {!country && "• Pays\n"}
                {!city && "• Ville"}
              </Text>
            </View>
          )}
        </Card>

        <Card className="p-4 mb-4">
          <Text className="text-lg font-semibold mb-3">Logo du club</Text>
          <Text className="text-sm text-neutral-500 mb-3">
            Ajoutez un logo pour votre club
          </Text>
          {logoUri ? (
            <View className="items-center">
              <View className="relative">
                <Image
                  source={{ uri: logoUri }}
                  style={{ width: 120, height: 120, borderRadius: 24 }}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  transition={200}
                />
                <Pressable
                  onPress={() => setLogoUri(null)}
                  className="absolute -top-2 -right-2 bg-error rounded-full p-1.5"
                >
                  <Icon name="X" size={16} color="white" />
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              onPress={pickLogo}
              className="border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-2xl p-6 items-center active:bg-neutral-50 dark:active:bg-neutral-700/50"
            >
              <Icon name="Plus" size={32} color="text-tertiary" />
              <Text className="text-sm text-neutral-500 mt-2">
                Ajouter un logo
              </Text>
            </Pressable>
          )}
        </Card>

        <Card className="p-4 mb-4">
          <Text className="text-lg font-semibold mb-3">Image de couverture</Text>
          <Text className="text-sm text-neutral-500 mb-3">
            Cette image apparaîtra en tête de la page du club
          </Text>
          {coverUri ? (
            <View className="items-center">
              <View className="relative">
                <Image
                  source={{ uri: coverUri }}
                  style={{ width: '100%', height: 160, borderRadius: 16 }}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  transition={200}
                />
                <Pressable
                  onPress={() => setCoverUri(null)}
                  className="absolute top-2 right-2 bg-error rounded-full p-1.5"
                >
                  <Icon name="X" size={16} color="white" />
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              onPress={pickCover}
              className="border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-2xl p-6 items-center active:bg-neutral-50 dark:active:bg-neutral-700/50"
            >
              <Icon name="Plus" size={32} color="text-tertiary" />
              <Text className="text-sm text-neutral-500 mt-2">
                Ajouter une image de couverture
              </Text>
            </Pressable>
          )}
        </Card>

        <Card className="p-4 mb-4">
          <Text className="text-lg font-semibold mb-3">Photos</Text>

          <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Photos ({heroUris.length}/10)
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

        <Card className="p-4 mb-4">
          <Text className="text-lg font-semibold mb-3">
            {t("clubs.hours.title")}
          </Text>
          <Text className="text-sm text-neutral-500 mb-3">
            {t("clubs.hours.hint")}
          </Text>
          <ClubOpeningHoursEditor value={openingHours} onChange={setOpeningHours} />
        </Card>

        <Button
          title="Publier le club"
          onPress={() => createMut.mutate()}
          loading={createMut.isPending}
          disabled={!isValid}
          className="mt-4"
        />
      </ScrollView>
    </SafeScreen>
  );
}