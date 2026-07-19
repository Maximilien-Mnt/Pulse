import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { COUNTRIES, SPORTS } from "@/lib/constants";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { clubPublicSchema } from "@/utils/validation";
import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { useMutation, useQuery } from "@tanstack/react-query";

function base64ToArrayBuffer(base64: string) {
  const binary = globalThis.atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function uploadImage(uri: string, path: string) {
  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: "base64" });
  const arrayBuffer = base64ToArrayBuffer(base64);
  const { error } = await supabase.storage.from("clubs").upload(path, arrayBuffer, {
    contentType: "image/jpeg",
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("clubs").getPublicUrl(path);
  return data.publicUrl;
}

export default function CreatePublicClubScreen() {
  const router = useRouter();
  const userId = useAuthStore((s) => s.userId);

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
      text1: "Active ton profil public pour créer un club public",
    });
    router.replace("/(tabs)/profile");
    return null;
  }

  const [name, setName] = useState("");
  const [sport, setSport] = useState("");
  const [description, setDescription] = useState("");
  const [country, setCountry] = useState(profile?.country ?? "");
  const [city, setCity] = useState(profile?.city ?? "");
  const [registrationUrl, setRegistrationUrl] = useState("");
  const [requiredLevel, setRequiredLevel] = useState("");
  const [address, setAddress] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [league, setLeague] = useState("");
  const [foundedDate, setFoundedDate] = useState("");
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [heroUris, setHeroUris] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const pickLogo = async () => {
    const p = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!p.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.8,
    });
    if (!res.canceled && res.assets[0]) {
      setLogoUri(res.assets[0].uri);
    }
  };

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

      const data = {
        name,
        sport,
        description,
        country,
        city,
        registration_url: registrationUrl,
        required_level: requiredLevel,
        address,
        contact_email: contactEmail,
        website_url: websiteUrl,
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
        logoUrl = await uploadImage(logoUri, `clubs/${userId}/${Date.now()}_logo.jpg`);
      }

      // Upload hero photos
      const heroUrls: string[] = [];
      for (let i = 0; i < heroUris.length; i++) {
        const url = await uploadImage(heroUris[i]!, `clubs/${userId}/${Date.now()}_hero_${i}.jpg`);
        heroUrls.push(url);
      }

      // Create club
      const { data: club, error: clubErr } = await supabase
        .from("clubs")
        .insert({
          name: name.trim(),
          sport,
          description: description.trim(),
          short_description: description.trim().slice(0, 100),
          country,
          city,
          registration_url: registrationUrl || null,
          required_level: requiredLevel || null,
          logo_url: logoUrl,
          hero_urls: heroUrls,
          address: address || null,
          contact_email: contactEmail || null,
          website_url: websiteUrl || null,
          league: league || null,
          founded_date: foundedDate || null,
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
      Toast.show({ type: "success", text1: "Club public publié !" });
      router.replace(`/(tabs)/clubs/${clubId}`);
    },
    onError: (err) => {
      if (err instanceof Error && err.message !== "Validation failed") {
        Toast.show({ type: "error", text1: err.message });
      }
    },
  });

  const isValid = name.trim().length > 0 && sport.length > 0 && description.length >= 50 && country && city;

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-[#0A0F1E]" edges={["top"]}>
      <View className="flex-row items-center px-4 py-3 border-b border-neutral-100 dark:border-neutral-800">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color="#1E6BFF" />
        </Pressable>
        <Text className="flex-1 text-lg font-bold text-center text-neutral-900 dark:text-neutral-50">
          Club public
        </Text>
        <View className="w-6" />
      </View>

      <ScrollView contentContainerClassName="p-4 pb-24">
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

          <Input
            label="Description * (min 50 caractères)"
            value={description}
            onChangeText={setDescription}
            multiline
            error={errors.description}
            placeholder="Décris ton club en détail..."
          />
          <Text className="text-xs text-neutral-500">{description.length}/50 caractères</Text>

          <View className="flex-row gap-3 mt-4">
            <View className="flex-1">
              <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Pays *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {COUNTRIES.slice(0, 10).map((c) => (
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
                      {c.code}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </View>

          <Input label="Ville *" value={city} onChangeText={setCity} error={errors.city} />

          <Input
            label="Lien d'inscription/contact"
            value={registrationUrl}
            onChangeText={setRegistrationUrl}
            error={errors.registration_url}
            placeholder="https://..."
            autoCapitalize="none"
          />

          <Input label="Niveau requis" value={requiredLevel} onChangeText={setRequiredLevel} placeholder="Ex: Intermédiaire" />

          <Input label="Adresse exacte" value={address} onChangeText={setAddress} />
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
            label="Site web"
            value={websiteUrl}
            onChangeText={setWebsiteUrl}
            error={errors.website_url}
            placeholder="https://..."
            autoCapitalize="none"
          />
          <Input label="Ligue/Division" value={league} onChangeText={setLeague} />
          <Input label="Date de fondation" value={foundedDate} onChangeText={setFoundedDate} placeholder="YYYY-MM-DD" />
        </Card>

        <Card className="p-4 mb-4">
          <Text className="text-lg font-semibold mb-3">Photos</Text>

          <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Logo</Text>
          <Pressable onPress={pickLogo} className="w-24 h-24 rounded-2xl border-2 border-dashed border-neutral-300 dark:border-neutral-700 items-center justify-center mb-4">
            {logoUri ? (
              <Image source={{ uri: logoUri }} style={{ width: 88, height: 88, borderRadius: 16 }} />
            ) : (
              <Ionicons name="camera-outline" size={32} color="#94A3B8" />
            )}
          </Pressable>

          <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Photos ({heroUris.length}/5)
          </Text>
          <Button title="Ajouter des photos" variant="secondary" onPress={pickHeroPhotos} />
          {heroUris.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3">
              {heroUris.map((uri, i) => (
                <View key={uri} className="mr-2 relative">
                  <Image source={{ uri }} style={{ width: 80, height: 80, borderRadius: 12 }} />
                  <Pressable
                    onPress={() => removeHero(i)}
                    className="absolute -top-2 -right-2 bg-error rounded-full p-1"
                  >
                    <Ionicons name="close" size={12} color="white" />
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          )}
        </Card>

        <Button
          title="Publier le club"
          onPress={() => createMut.mutate()}
          loading={createMut.isPending}
          disabled={!isValid}
          className="mt-4"
        />
      </ScrollView>
    </SafeAreaView>
  );
}
