import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { SPORTS, SPORT_LEVELS } from "@/lib/constants";
import { COMMON_COUNTRIES, countryFlag } from "@/utils/countries";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { clubPrivateSchema } from "@/utils/validation";
import { Icon } from "@/components/ui/Icon";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Image } from "expo-image";
import { Pressable, ScrollView, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { uploadImageToStorage } from "@/lib/imageUpload";
import { SafeScreen } from "@/components/shared/SafeScreen";
import Toast from "react-native-toast-message";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useKeyboardHeight } from "@/lib/keyboardUtils";
import { KeyboardAwareScrollView } from "@/components/ui/KeyboardAwareScrollView";
import { BackButton } from "@/components/ui/BackButton";
import { t } from "@/hooks/useTranslation";
import { ClubOpeningHoursEditor } from "@/components/clubs/ClubOpeningHours";
import type { OpeningHourSlot } from "@/lib/openingHours";

export default function CreatePrivateClubScreen() {
  const router = useRouter();
  const userId = useAuthStore((s) => s.userId);
  const keyboardHeight = useKeyboardHeight();

  const [name, setName] = useState("");
  const [sports, setSports] = useState<string[]>([]);
  const [requiredLevels, setRequiredLevels] = useState<Record<string, string>>({});
  const [description, setDescription] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [tiktokUrl, setTiktokUrl] = useState("");
  const [extraLink, setExtraLink] = useState("");
  const [openingHours, setOpeningHours] = useState<OpeningHourSlot[]>([]);
  const [searchQ, setSearchQ] = useState("");
  const [invitees, setInvitees] = useState<string[]>([]);
  const [searchHits, setSearchHits] = useState<
    { id: string; username: string; full_name: string; avatar_url: string | null }[]
  >([]);
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [heroUris, setHeroUris] = useState<string[]>([]);

  const primarySport = sports[0] ?? "";

  const toggleSport = (id: string) => {
    setSports((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  };

  async function uploadImage(uri: string, path: string) {
    return uploadImageToStorage({ bucket: "clubs", path, uri });
  }

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
      setLogoUri(first.uri);
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
      setCoverUri(first.uri);
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

  const { data: profile } = useQuery({
    queryKey: ["profile", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", userId!).single();
      return data;
    },
  });

  const searchUsers = useCallback(async (q: string) => {
    if (q.length < 2) {
      setSearchHits([]);
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url")
      .ilike("username", `%${q}%`)
      .neq("id", userId!)
      .limit(10);
    setSearchHits(data ?? []);
  }, [userId]);

  const toggleInvitee = (userId: string) => {
    setInvitees((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const selectedUsers = useMemo(() => {
    return searchHits.filter((u) => invitees.includes(u.id));
  }, [searchHits, invitees]);

  const createMut = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("auth");

      const validation = clubPrivateSchema.safeParse({
        name,
        sports,
        sport: primarySport,
        description,
        invitees,
        country,
        city,
        address,
        postal_code: postalCode,
        phone_number: phoneNumber,
        website_url: websiteUrl,
        instagram_url: instagramUrl,
        facebook_url: facebookUrl,
        tiktok_url: tiktokUrl,
        extra_link: extraLink,
        opening_hours: openingHours,
      });
      if (!validation.success) {
        throw new Error(validation.error.errors[0]?.message ?? "Validation error");
      }

      // Upload logo
      let logoUrl: string | null = null;
      if (logoUri) {
        logoUrl = await uploadImage(logoUri, `${userId}/${Date.now()}_logo.jpg`);
      }

      // Upload cover
      let coverUrl: string | null = null;
      if (coverUri) {
        coverUrl = await uploadImage(coverUri, `${userId}/${Date.now()}_cover.jpg`);
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
          description: description.trim() || '',
          short_description: shortDescription.trim() || '',
          is_private: true,
          country: country || profile?.country || "",
          city: city || profile?.city || "",
          address: address || null,
          postal_code: postalCode || null,
          phone_number: phoneNumber || null,
          website_url: websiteUrl || null,
          instagram_url: instagramUrl || null,
          facebook_url: facebookUrl || null,
          tiktok_url: tiktokUrl || null,
          extra_link: extraLink || null,
          opening_hours: openingHours.length > 0 ? openingHours : [],
          required_levels: Object.keys(requiredLevels).length > 0 ? requiredLevels : null,
          created_by: userId,
          logo_url: logoUrl,
          cover_url: coverUrl,
          hero_urls: heroUrls,
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

      // Send invitations (via SECURITY DEFINER RPC to bypass notifications RLS)
      for (const inviteeId of invitees) {
        await supabase.rpc("notify_user", {
          p_user_id: inviteeId,
          p_type: "club_invitation",
          p_title: t("clubs.invite"),
          p_body: t("clubs.inviteBody", { name: profile?.full_name ?? "Someone", club: name }),
          p_data: { club_id: club.id, inviter_id: userId },
        });
      }

      return club.id;
    },
    onSuccess: (clubId) => {
      Toast.show({ type: "success", text1: t("create.club.privateSuccess") });
      router.replace(`/(tabs)/clubs/${clubId}`);
    },
    onError: (err) => {
      Toast.show({ type: "error", text1: err instanceof Error ? err.message : t("common.error") });
    },
  });

  const isValid = name.trim().length > 0 && primarySport.length > 0;

  return (
    <SafeScreen className="flex-1 bg-neutral-50 dark:bg-[#0A0F1E]" edges={["top"]}>
      <View className="flex-row items-center px-4 py-3 border-b border-neutral-100 dark:border-neutral-800">
        <BackButton />
        <Text className="flex-1 text-lg font-bold text-center text-neutral-900 dark:text-neutral-50">
          Club privé
        </Text>
        <View className="w-11" />
      </View>

      <ScrollView 
        contentContainerStyle={{ paddingBottom: keyboardHeight > 0 ? keyboardHeight + 20 : 20 }}
        keyboardShouldPersistTaps="handled"
      >
        <Card className="p-4 mb-4">
          <Text className="text-sm text-neutral-500 mb-4">
            Crée un club privé pour inviter uniquement tes amis et contacts.
          </Text>

          <Input
            label="Nom du club *"
            value={name}
            onChangeText={setName}
            placeholder={t("create.club.example")}
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
                  sports.includes(s.id)
                    ? "bg-primary"
                    : "bg-neutral-200 dark:bg-neutral-800"
                }`}
              >
                <Text
                  className={
                    sports.includes(s.id)
                      ? "text-white font-medium"
                      : "text-neutral-700 dark:text-neutral-200"
                  }
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
                          <Text className={active ? "text-white font-medium text-sm" : "text-neutral-700 dark:text-neutral-200 text-sm"}>
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

          <Input
            label="Description courte (optionnel)"
            value={shortDescription}
            onChangeText={setShortDescription}
            placeholder="Une phrase pour présenter le club"
          />

          <Input
            label="Description"
            value={description}
            onChangeText={setDescription}
            multiline
            placeholder="Description optionnelle..."
          />
        </Card>

        <Card className="p-4 mb-4">
          <Text className="text-lg font-semibold mb-3">Localisation</Text>
          <Text className="text-sm text-neutral-500 mb-3">
            Optionnel — renseigne la ville pour faciliter la découverte du club.
          </Text>
          <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Pays</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
            {COMMON_COUNTRIES.map((c) => (
              <Pressable
                key={c.code}
                onPress={() => setCountry(c.label)}
                className={`px-3 py-2 rounded-full mr-2 ${
                  country === c.label ? "bg-primary" : "bg-neutral-200 dark:bg-neutral-800"
                }`}
              >
                <Text className={country === c.label ? "text-white text-sm" : "text-neutral-700 dark:text-neutral-200 text-sm"}>
                  {countryFlag(c.code)} {c.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          <Input label="Ville" value={city} onChangeText={setCity} placeholder="Ex: Paris" />
          <Input
            label="Adresse exacte (optionnel)"
            value={address}
            onChangeText={setAddress}
            placeholder="Ex: 12 rue des Sports"
          />
          <Input label="Code postal (optionnel)" value={postalCode} onChangeText={setPostalCode} keyboardType="number-pad" />
        </Card>

        <Card className="p-4 mb-4">
          <Text className="text-lg font-semibold mb-3">Contact & liens</Text>
          <Text className="text-sm text-neutral-500 mb-3">Tous optionnels.</Text>
          <Input
            label="Téléphone (optionnel)"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            placeholder="+33 6 12 34 56 78"
            keyboardType="phone-pad"
          />
          <Input
            label="Site web (optionnel)"
            value={websiteUrl}
            onChangeText={setWebsiteUrl}
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
                  style={{ width: "100%", height: 160, borderRadius: 16 }}
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
          <Text className="text-lg font-semibold mb-3">Photos du club</Text>
          <Text className="text-sm text-neutral-500 mb-3">
            Ajoutez des photos pour illustrer votre club ({heroUris.length}/10)
          </Text>
          <Button
            title="Ajouter des photos"
            variant="secondary"
            onPress={pickHeroPhotos}
            disabled={heroUris.length >= 10}
          />
          {heroUris.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mt-3"
            >
              {heroUris.map((uri, i) => (
                <View key={uri} className="mr-2 relative">
                  <Image
                    source={{ uri }}
                    style={{ width: 80, height: 80, borderRadius: 12 }}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    transition={200}
                  />
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
          <Text className="text-lg font-semibold mb-3">{t("clubs.inviteMembers")}</Text>
          <Input
            label={t("common.searchByUsername")}
            value={searchQ}
            onChangeText={(t) => {
              setSearchQ(t);
              void searchUsers(t);
            }}
            autoCapitalize="none"
            placeholder="@username"
          />

          {searchHits.length > 0 && (
            <View className="mt-2 border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden">
              {searchHits.map((user, index) => (
                <Pressable
                  key={user.id}
                  onPress={() => toggleInvitee(user.id)}
                  className={`flex-row items-center p-4 active:bg-primary/5 ${index < searchHits.length - 1 ? 'border-b border-neutral-100 dark:border-neutral-800' : ''}`}
                >
                  <Avatar uri={user.avatar_url} size={40} />
                  <View className="ml-3 flex-1">
                    <Text className="font-medium text-neutral-900 dark:text-neutral-50">
                      {user.full_name}
                    </Text>
                    <Text className="text-sm text-neutral-500">@{user.username}</Text>
                  </View>
                  {invitees.includes(user.id) && (
                    <Icon name="CheckCircle2" size={24} color="success" />
                  )}
                </Pressable>
              ))}
            </View>
          )}

          {invitees.length > 0 && (
            <View className="mt-3">
              <Text className="text-sm text-neutral-500 mb-2">
                {t("create.club.invitedCount", { count: invitees.length })}
              </Text>
              <View className="flex-row flex-wrap">
                {selectedUsers.map((u) => (
                  <View
                    key={u.id}
                    className="flex-row items-center bg-primary/10 px-2 py-1 rounded-full mr-2 mb-2"
                  >
                    <Avatar uri={u.avatar_url} size={20} />
                    <Text className="ml-1 text-sm text-primary">@{u.username}</Text>
                    <Pressable onPress={() => toggleInvitee(u.id)} className="ml-1">
                      <Icon name="XCircle" size={16} color="error-500" />
                    </Pressable>
                  </View>
                ))}
              </View>
            </View>
          )}
        </Card>

        <Button
          title={t("create.club.create")}
          onPress={() => createMut.mutate()}
          loading={createMut.isPending}
          disabled={!isValid}
          className="mt-4"
        />
      </ScrollView>
    </SafeScreen>
  );
}