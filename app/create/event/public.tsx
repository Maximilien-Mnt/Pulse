import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { COUNTRIES, EVENT_CATEGORIES, SPORTS } from "@/lib/constants";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { eventPublicSchema } from "@/utils/validation";
import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { useMutation, useQuery } from "@tanstack/react-query";
import DateTimePicker from "@react-native-community/datetimepicker";
import Slider from "@react-native-community/slider";

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
  const { error } = await supabase.storage.from("events").upload(path, arrayBuffer, {
    contentType: "image/jpeg",
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("events").getPublicUrl(path);
  return data.publicUrl;
}

export default function CreatePublicEventScreen() {
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
      text1: "Active ton profil public pour créer un événement public",
    });
    router.replace("/(tabs)/profile");
    return null;
  }

  // Get user's clubs for linking
  const { data: myClubs } = useQuery({
    queryKey: ["my-clubs", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("clubs")
        .select("id, name")
        .eq("created_by", userId!)
        .eq("is_private", false);
      return data ?? [];
    },
  });

  const [name, setName] = useState("");
  const [sport, setSport] = useState("");
  const [description, setDescription] = useState("");
  const [country, setCountry] = useState(profile?.country ?? "");
  const [city, setCity] = useState(profile?.city ?? "");
  const [venueAddress, setVenueAddress] = useState("");
  const [registrationUrl, setRegistrationUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [priceCents, setPriceCents] = useState(0);
  const [requiredLevel, setRequiredLevel] = useState("");
  const [difficulty, setDifficulty] = useState(3);
  const [category, setCategory] = useState("");
  const [placesTotal, setPlacesTotal] = useState("");
  const [clubId, setClubId] = useState("");
  const [startDate, setStartDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)); // +7 days
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
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
          if (e.path[0]) errs[e.path[0] as string] = e.message;
        });
        setErrors(errs);
        throw new Error("Validation failed");
      }

      // Upload logo
      let logoUrl: string | null = null;
      if (logoUri) {
        logoUrl = await uploadImage(logoUri, `events/${userId}/${Date.now()}_logo.jpg`);
      }

      // Upload hero photos
      const heroUrls: string[] = [];
      for (let i = 0; i < heroUris.length; i++) {
        const url = await uploadImage(heroUris[i]!, `events/${userId}/${Date.now()}_hero_${i}.jpg`);
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
          logo_url: logoUrl,
          hero_urls: heroUrls,
          start_date: startDate.toISOString(),
          end_date: endDate?.toISOString() || null,
          is_private: false,
          club_id: clubId || null,
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

      // Notify club members if linked to a club
      if (clubId) {
        const { data: members } = await supabase
          .from("club_members")
          .select("user_id")
          .eq("club_id", clubId);
        for (const member of members ?? []) {
          if (member.user_id !== userId) {
            await supabase.from("notifications").insert({
              user_id: member.user_id,
              type: "event_notification",
              title: "Nouvel événement dans ton club",
              body: `Un nouvel événement "${name}" a été créé dans un de tes clubs`,
              data: { event_id: event.id, club_id: clubId },
            });
          }
        }
      }

      return event.id;
    },
    onSuccess: (eventId) => {
      Toast.show({ type: "success", text1: "Événement public publié !" });
      router.replace(`/(tabs)/events/${eventId}`);
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
          Événement public
        </Text>
        <View className="w-6" />
      </View>

      <ScrollView contentContainerClassName="p-4 pb-24">
        <Card className="p-4 mb-4">
          <Text className="text-sm text-neutral-500 mb-4">
            Crée un événement public visible par tous. Tu dois avoir un profil public activé.
          </Text>

          <Input
            label="Nom de l'événement *"
            value={name}
            onChangeText={setName}
            error={errors.name}
            placeholder="Ex: Tournoi de tennis d'été"
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
          <Pressable
            onPress={() => setShowStartPicker(true)}
            className="border border-neutral-300 dark:border-neutral-700 rounded-xl px-4 py-3 mb-4"
          >
            <Text className="text-neutral-900 dark:text-neutral-50">
              {startDate.toLocaleDateString("fr-FR", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </Pressable>
          {showStartPicker && (
            <DateTimePicker
              value={startDate}
              mode="datetime"
              onChange={(_, date) => {
                setShowStartPicker(false);
                if (date) setStartDate(date);
              }}
            />
          )}

          <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Date de fin
          </Text>
          <Pressable
            onPress={() => setShowEndPicker(true)}
            className="border border-neutral-300 dark:border-neutral-700 rounded-xl px-4 py-3 mb-4"
          >
            <Text className="text-neutral-900 dark:text-neutral-50">
              {endDate
                ? endDate.toLocaleDateString("fr-FR", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "Non définie"}
            </Text>
          </Pressable>
          {showEndPicker && (
            <DateTimePicker
              value={endDate ?? new Date()}
              mode="datetime"
              onChange={(_, date) => {
                setShowEndPicker(false);
                if (date) setEndDate(date);
              }}
            />
          )}

          <Input
            label="Description * (min 50 caractères)"
            value={description}
            onChangeText={setDescription}
            multiline
            error={errors.description}
            placeholder="Décris ton événement en détail..."
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
                        country === c.code
                          ? "text-white font-medium text-sm"
                          : "text-neutral-700 dark:text-neutral-200 text-sm"
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
          <Input label="Adresse exacte" value={venueAddress} onChangeText={setVenueAddress} />
          <Input
            label="Lien d'inscription"
            value={registrationUrl}
            onChangeText={setRegistrationUrl}
            placeholder="https://..."
            autoCapitalize="none"
          />
          <Input
            label="Site web"
            value={websiteUrl}
            onChangeText={setWebsiteUrl}
            placeholder="https://..."
            autoCapitalize="none"
          />

          <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2 mt-4">
            Prix (en centimes) - 0 = gratuit
          </Text>
          <View className="flex-row items-center gap-3 mb-4">
            <Slider
              style={{ flex: 1, height: 40 }}
              minimumValue={0}
              maximumValue={10000}
              step={100}
              value={priceCents}
              onValueChange={(v) => setPriceCents(Math.round(v))}
              minimumTrackTintColor="#1E6BFF"
              maximumTrackTintColor="#CBD5E1"
            />
            <Text className="w-20 text-right text-neutral-900 dark:text-neutral-50">
              {(priceCents / 100).toFixed(2)} €
            </Text>
          </View>

          <Input label="Niveau requis" value={requiredLevel} onChangeText={setRequiredLevel} />

          <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Difficulté ({difficulty}/5)
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

          <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Catégorie</Text>
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
            label="Nombre de places"
            value={placesTotal}
            onChangeText={setPlacesTotal}
            keyboardType="numeric"
            placeholder="Illimité si vide"
          />

          {myClubs && myClubs.length > 0 && (
            <>
              <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Club lié (optionnel)
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                {myClubs.map((club) => (
                  <Pressable
                    key={club.id}
                    onPress={() => setClubId(clubId === club.id ? "" : club.id)}
                    className={`px-4 py-2 rounded-full mr-2 ${
                      clubId === club.id ? "bg-primary" : "bg-neutral-200 dark:bg-neutral-800"
                    }`}
                  >
                    <Text
                      className={clubId === club.id ? "text-white font-medium" : "text-neutral-700 dark:text-neutral-200"}
                    >
                      {club.name}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </>
          )}
        </Card>

        <Card className="p-4 mb-4">
          <Text className="text-lg font-semibold mb-3">Photos</Text>

          <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Logo</Text>
          <Pressable
            onPress={pickLogo}
            className="w-24 h-24 rounded-2xl border-2 border-dashed border-neutral-300 dark:border-neutral-700 items-center justify-center mb-4"
          >
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
          title="Publier l'événement"
          onPress={() => createMut.mutate()}
          loading={createMut.isPending}
          disabled={!isValid}
          className="mt-4"
        />
      </ScrollView>
    </SafeAreaView>
  );
}
