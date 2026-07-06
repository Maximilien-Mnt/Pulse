import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { supabase } from "@/lib/supabase";
import { useSignupStore } from "@/stores/signupStore";
import { signupStep5Schema } from "@/utils/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { Stack, useRouter } from "expo-router";
import dayjs from "dayjs";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Pressable, ScrollView, Switch, Text, TextInput, View } from "react-native";
import Toast from "react-native-toast-message";
import { z } from "zod";

type Form = z.infer<typeof signupStep5Schema>;

export default function SignupStep5() {
  const router = useRouter();
  const resetSignup = useSignupStore((s) => s.reset);
  const step1 = useSignupStore((s) => s.step1);
  const step2 = useSignupStore((s) => s.step2);
  const step3 = useSignupStore((s) => s.step3);
  const step4 = useSignupStore((s) => s.step4);
  const setStep5 = useSignupStore((s) => s.setStep5);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { control, handleSubmit, watch, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(signupStep5Schema),
    defaultValues: {
      bio: "",
      discovery: "",
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
    setSubmitting(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: step1.email,
        password: step1.password,
      });
      if (error) throw error;
      const user = data.session?.user ?? data.user;
      if (!user) {
        Toast.show({ type: "info", text1: "Vérifie ta boîte mail pour confirmer ton compte" });
        router.replace("/auth/signin");
        return;
      }

      let avatar_url: string | null = null;
      if (avatarUri) {
        const resBlob = await fetch(avatarUri);
        const blob = await resBlob.blob();
        const path = `${user.id}/avatar.jpg`;
        const { error: upErr } = await supabase.storage.from("avatars").upload(path, blob, {
          contentType: "image/jpeg",
          upsert: true,
        });
        if (!upErr) {
          const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
          avatar_url = pub.publicUrl;
        }
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
        discovery_source: values.discovery || null,
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
          times_per_week: s.timesPerWeek,
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
    <View className="flex-1 bg-neutral-50 dark:bg-[#0A0F1E]">
      <Stack.Screen options={{ title: "Étape 5/5" }} />
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
        <Controller
          control={control}
          name="discovery"
          render={({ field: { value, onChange } }) => (
            <Input label="Comment as-tu découvert Pulse ? (optionnel)" value={value ?? ""} onChangeText={onChange} />
          )}
        />
        <View className="flex-row items-center justify-between py-3">
          <Text className="flex-1 text-neutral-800 dark:text-neutral-100 pr-4">J&apos;accepte les CGU</Text>
          <Controller
            control={control}
            name="acceptTerms"
            render={({ field: { value, onChange } }) => <Switch value={value} onValueChange={onChange} />}
          />
        </View>
        {errors.acceptTerms ? <Text className="text-error text-sm mb-2">{String(errors.acceptTerms.message)}</Text> : null}
        <View className="flex-row items-center justify-between py-3">
          <Text className="flex-1 text-neutral-800 dark:text-neutral-100 pr-4">Politique de confidentialité</Text>
          <Controller
            control={control}
            name="acceptPrivacy"
            render={({ field: { value, onChange } }) => <Switch value={value} onValueChange={onChange} />}
          />
        </View>
        {errors.acceptPrivacy ? <Text className="text-error text-sm mb-2">{String(errors.acceptPrivacy.message)}</Text> : null}
        <View className="flex-row gap-3 mt-4">
          <Button title="Précédent" variant="secondary" onPress={() => router.back()} />
          <Button title="Créer mon compte" onPress={onSubmit} loading={submitting} className="flex-1" />
        </View>
      </ScrollView>
    </View>
  );
}
