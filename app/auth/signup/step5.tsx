import { Button } from "@/components/ui/Button";
import { SafeScreen } from "@/components/shared/SafeScreen";
import { Header } from "@/components/shared/Header";
import { Input } from "@/components/ui/Input";
import { supabase } from "@/lib/supabase";
import { DISCOVERY_SOURCES } from "@/lib/constants";
import { useSignupStore } from "@/stores/signupStore";
import { signupStep5Schema } from "@/utils/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import * as Linking from "expo-linking";
import * as FileSystem from "expo-file-system";
import dayjs from "dayjs";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Pressable, ScrollView, Switch, Text, TextInput, View } from "react-native";
import Toast from "react-native-toast-message";
import { z } from "zod";
import { usePostHog } from "posthog-react-native";
import { savePendingSignup } from "@/utils/signup";

type Form = z.infer<typeof signupStep5Schema>;

/** The Other chip value that reveals a free-text details field. */
const OTHER_OPTION = "Autre";

/**
 * Resolve the value persisted as discovery_source:
 *  - a preset option -> the option itself
 *  - Other           -> the user's free-text details (falls back to Other
 *                        when no details were provided)
 */
function resolveDiscovery(values: Form): string | null {
  if (!values.discovery) return null;
  if (values.discovery === OTHER_OPTION) {
    const details = values.discoveryDetails?.trim();
    return details ? details : OTHER_OPTION;
  }
  return values.discovery || null;
}

function base64ToArrayBuffer(base64: string) {
  const binary = globalThis.atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function uploadAvatarToSupabase(uri: string, path: string) {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: "base64",
  });
  const arrayBuffer = base64ToArrayBuffer(base64);
  const { error } = await supabase.storage.from("avatars").upload(path, arrayBuffer, {
    contentType: "image/jpeg",
    upsert: true,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return data.publicUrl;
}

export default function SignupStep5() {
  const router = useRouter();
  const posthog = usePostHog();
  const resetSignup = useSignupStore((s) => s.reset);
  const step1 = useSignupStore((s) => s.step1);
  const step2 = useSignupStore((s) => s.step2);
  const step3 = useSignupStore((s) => s.step3);
  const step4 = useSignupStore((s) => s.step4);
  const setStep5 = useSignupStore((s) => s.setStep5);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<Form>({
    resolver: zodResolver(signupStep5Schema),
    defaultValues: {
      bio: "",
      discovery: "",
      discoveryDetails: "",
      acceptTerms: false,
      acceptPrivacy: false,
    },
  });

  const bioLen = watch("bio")?.length ?? 0;

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Toast.show({ type: "error", text1: "Permission photos refusée" });
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.7, allowsEditing: true, aspect: [1, 1] });
    if (!res.canceled && res.assets[0]) {
      setAvatarUri(res.assets[0].uri);
      setStep5({ bio: watch("bio"), discovery: watch("discovery"), avatarLocalUri: res.assets[0].uri });
    }
  };

  const onSubmit = handleSubmit(async (values) => {
    if (!step1 || !step2 || !step3.length || !step4) {
      Toast.show({ type: "error", text1: "Données d'inscription incomplètes" });
      return;
    }

    const discoverySource = resolveDiscovery(values);

    setSubmitting(true);

    try {
      const emailRedirectTo = Linking.createURL("/auth/signin");

      const { data, error } = await supabase.auth.signUp({
        email: step1.email,
        password: step1.password,
        options: {
          emailRedirectTo,
        },
      });

      if (error) throw error;

      const user = data.session?.user ?? data.user;

      if (!user) {
        // Email confirmation required: persist signup data for replay after confirmation
        await savePendingSignup({
          profile: {
            id: crypto.randomUUID(),
            email: step1.email,
            full_name: step1.fullName,
            username: step1.username,
            avatar_url: null,
            avatarLocalUri: avatarUri,
            bio: values.bio || null,
            birth_date: dayjs(step2.birthDate).format("YYYY-MM-DD"),
            country: step2.country,
            city: step2.city ?? null,
            language: step1.language,
            height_cm: step4.heightCm ? parseInt(step4.heightCm, 10) : null,
            weight_kg: step4.weightKg ? parseFloat(step4.weightKg) : null,
            discovery_source: discoverySource,
            interested_sports: step4.interestedSports,
          },
          sports: step3,
          objectives: step4.objectives,
        });
        Toast.show({ type: "info", text1: "Vérifie ta boîte mail pour confirmer ton compte" });
        router.replace("/auth/signin");
        return;
      }

      let avatar_url: string | null = null;
      if (avatarUri) {
        avatar_url = await uploadAvatarToSupabase(avatarUri, `${user.id}/avatar.jpg`);
      }

      const { error: pe } = await supabase.from("profiles").insert({
        id: user.id,
        email: step1.email,
        full_name: step1.fullName,
        username: step1.username,
        avatar_url,
        bio: values.bio || null,
        birth_date: dayjs(step2.birthDate).format("YYYY-MM-DD"),
        country: step2.country,
        city: step2.city ?? null,
        language: step1.language,
        height_cm: step4.heightCm ? parseInt(step4.heightCm, 10) : null,
        weight_kg: step4.weightKg ? parseFloat(step4.weightKg) : null,
        discovery_source: discoverySource,
        interested_sports: step4.interestedSports,
      });
      if (pe) throw pe;

      for (const s of step3) {
        const { error: se } = await supabase.from("user_sports").insert({
          user_id: user.id,
          sport_id: s.sportId,
          level: s.level,
          practice: s.practice,
          weekdays: s.weekdays,
          start_hour: s.startHour,
          end_hour: s.endHour,
        });
        if (se) throw se;
      }

      for (const o of step4.objectives) {
        const { error: oe } = await supabase.from("user_objectives").insert({
          user_id: user.id,
          objective: o,
        });
        if (oe) throw oe;
      }

      posthog.identify(user.id, {
        $set: { username: step1.username, language: step1.language },
        $set_once: { signup_date: new Date().toISOString(), discovery_source: discoverySource },
      });
      posthog.capture("user_signed_up", {
        language: step1.language,
        has_avatar: !!avatarUri,
        sports_count: step3.length,
        discovery_source: discoverySource,
      });

      resetSignup();
      Toast.show({ type: "success", text1: "Compte créé !" });
      router.replace("/(tabs)/feed");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erreur";
      Toast.show({ type: "error", text1: msg });
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <SafeScreen edges={["top"]} className="flex-1 bg-neutral-50 dark:bg-[#0A0F1E]">
      <Header title="Étape 5/5" showBackButton backToLanding className="mb-2" />
      <ScrollView contentContainerClassName="px-4 py-4 pb-24">
        <Text className="text-sm text-neutral-500 mb-1">Biographie (optionnel, max 300)</Text>
        <Controller
          control={control}
          name="bio"
          render={({ field: { value, onChange } }) => (
            <View className="mb-2">
              <TextInput
                multiline
                maxLength={300}
                className="border-2 border-neutral-200 dark:border-neutral-700 rounded-xl p-3 text-base text-neutral-900 dark:text-neutral-50 min-h-[100px]"
                placeholder="Quelques mots sur toi…"
                value={value}
                onChangeText={onChange}
              />
              <Text className="text-xs text-neutral-400 text-right mt-1">{bioLen}/300</Text>
            </View>
          )}
        />
        <Pressable onPress={pickImage} className="mb-4 items-center">
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={{ width: 112, height: 112, borderRadius: 56 }} contentFit="cover" />
          ) : (
            <View className="w-28 h-28 rounded-full bg-neutral-200 dark:bg-neutral-800 items-center justify-center">
              <Text className="text-primary font-semibold">Photo</Text>
            </View>
          )}
        </Pressable>
        <Text className="text-xs text-neutral-500 text-center mb-4">Optionnel - Tu pourras ajouter une photo plus tard</Text>
        <Text className="text-sm text-neutral-500 mb-2">Comment as-tu découvert Pulse ? (optionnel)</Text>
        <Controller
          control={control}
          name="discovery"
          render={({ field: { value, onChange } }) => (
            <View className="flex-row flex-wrap mb-4">
              {DISCOVERY_SOURCES.map((o) => (
                <Pressable
                  key={o}
                  onPress={() => onChange(value === o ? "" : o)}
                  className={
                    value === o
                      ? "px-3 py-2 rounded-full mr-2 mb-2 bg-primary"
                      : "px-3 py-2 rounded-full mr-2 mb-2 bg-neutral-200 dark:bg-neutral-800"
                  }
                >
                  <Text className={value === o ? "text-white text-xs" : "text-xs text-neutral-800 dark:text-neutral-100"}>{o}</Text>
                </Pressable>
              ))}
            </View>
          )}
        />
        {watch("discovery") === OTHER_OPTION ? (
          <Controller
            control={control}
            name="discoveryDetails"
            render={({ field: { value, onChange } }) => (
              <Input
                label="Précisez (optionnel)"
                value={value ?? ""}
                onChangeText={onChange}
                placeholder="Racontez-nous comment vous avez trouvé Pulse..."
                multiline
              />
            )}
          />
        ) : null}
        <Pressable
          onPress={() => router.push("/auth/signup/legal?document=terms")}
          className="flex-row items-center justify-between py-3"
        >
          <Text className="flex-1 text-primary underline dark:text-primary pr-4">J'accepte les CGU</Text>
          <Controller
            control={control}
            name="acceptTerms"
            render={({ field: { value, onChange } }) => (
              <Pressable onPress={() => onChange(!value)} hitSlop={8}>
                <Switch value={value} onValueChange={onChange} />
              </Pressable>
            )}
          />
        </Pressable>
        {errors.acceptTerms ? <Text className="text-error text-sm mb-2">{String(errors.acceptTerms.message)}</Text> : null}
        <Pressable
          onPress={() => router.push("/auth/signup/legal?document=privacy")}
          className="flex-row items-center justify-between py-3"
        >
          <Text className="flex-1 text-primary underline dark:text-primary pr-4">Politique de confidentialité</Text>
          <Controller
            control={control}
            name="acceptPrivacy"
            render={({ field: { value, onChange } }) => (
              <Pressable onPress={() => onChange(!value)} hitSlop={8}>
                <Switch value={value} onValueChange={onChange} />
              </Pressable>
            )}
          />
        </Pressable>
        {errors.acceptPrivacy ? <Text className="text-error text-sm mb-2">{String(errors.acceptPrivacy.message)}</Text> : null}
        <View className="flex-row gap-3 mt-4">
          <Button title="Précédent" variant="secondary" onPress={() => router.back()} />
          <Button title="Créer mon compte" onPress={onSubmit} loading={submitting} className="flex-1" />
        </View>
      </ScrollView>
    </SafeScreen>
  );
}