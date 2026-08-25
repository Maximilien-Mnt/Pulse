import { Button } from "@/components/ui/Button";
import { SafeScreen } from "@/components/shared/SafeScreen";
import { Header } from "@/components/shared/Header";
import { SignupStepProgress } from "@/components/signup/SignupStepProgress";
import { Input } from "@/components/ui/Input";
import { supabase } from "@/lib/supabase";
import { DISCOVERY_SOURCES } from "@/lib/constants";
import { useSignupStore } from "@/stores/signupStore";
import { signupStep5Schema } from "@/utils/validation";
import { localizeError } from "@/utils/localizeError";
import { zodResolver } from "@hookform/resolvers/zod";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import * as Linking from "expo-linking";
import * as FileSystem from "expo-file-system";
import dayjs from "dayjs";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Switch, Text, TextInput, View } from "react-native";
import Toast from "react-native-toast-message";
import { z } from "zod";
import { usePostHog } from "posthog-react-native";
import { useTranslation } from "@/hooks/useTranslation";
import { signupEdgeFunctionUrl } from "@/lib/supabase";

type Form = z.infer<typeof signupStep5Schema>;

/** Discovery option key that reveals a free-text details field. */
const OTHER_KEY = "other";

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
  const { t, language } = useTranslation();
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
      Toast.show({ type: "error", text1: t("error.permissionPhotos") });
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
      Toast.show({ type: "error", text1: t("error.incompleteSignup") });
      return;
    }

    let discoverySource: string | null = null;
    if (values.discovery) {
      if (values.discovery === OTHER_KEY) {
        const details = values.discoveryDetails?.trim();
        discoverySource = details ? details : t("signup.discovery.other");
      } else {
        const src = DISCOVERY_SOURCES.find((s) => s.key === values.discovery);
        discoverySource = src ? t(src.labelKey as never) : values.discovery;
      }
    }

    setSubmitting(true);

    try {
      let avatar_url: string | null = null;
      if (avatarUri) {
        // Upload avatar before calling the edge function so we can pass the public URL
        avatar_url = await uploadAvatarToSupabase(avatarUri, `pending-${Date.now()}.jpg`);
      }

      const payload = {
        email: step1.email,
        password: step1.password,
        full_name: step1.fullName,
        username: step1.username,
        birth_date: dayjs(step2.birthDate).format("YYYY-MM-DD"),
        country: step2.country,
        city: step2.city ?? null,
        language: step1.language,
        height_cm: step4.heightCm ? parseInt(step4.heightCm, 10) : null,
        weight_kg: step4.weightKg ? parseFloat(step4.weightKg) : null,
        bio: values.bio || null,
        avatar_url,
        discovery_source: discoverySource,
        interested_sports: step4.interestedSports,
        sports: step3.map((s) => ({
          sportId: s.sportId,
          level: s.level,
          practice: s.practice,
          timeSlots: s.timeSlots,
          levelOther: s.levelOther,
          practiceOther: s.practiceOther,
        })),
        objectives: step4.objectives,
        objectives_details: step4.objectivesDetails,
      };

      const res = await fetch(signupEdgeFunctionUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = (await res.json()) as {
        ok: boolean;
        userId?: string;
        error?: string;
        needsConfirmation?: boolean;
      };

      if (!res.ok || !json.ok) {
        if (json.error === "UNDERAGE") {
          router.replace("/auth/signup/under16");
          return;
        }
        throw new Error(json.error ?? "signup_failed");
      }

      if (json.needsConfirmation) {
        Toast.show({ type: "info", text1: t("toast.confirmEmail") });
        router.replace("/auth/signup/check-email");
        return;
      }

      // Auto sign-in when no email confirmation is required
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: step1.email,
        password: step1.password,
      });
      if (signInError) throw signInError;

      posthog.identify(json.userId ?? step1.email, {
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
      Toast.show({ type: "success", text1: t("toast.accountCreated") });
      router.replace("/(tabs)/feed");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t("error.generic");
      Toast.show({ type: "error", text1: msg });
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <SafeScreen edges={["top"]} className="flex-1 bg-neutral-50 dark:bg-[#0A0F1E]">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerClassName="px-6 py-4 pb-10" keyboardShouldPersistTaps="handled">
          <Header
            title={t("signup.step5.title")}
            showBackButton
            backToLanding
            titleClassName="text-2xl text-neutral-900 dark:text-neutral-50"
            className="mb-2 px-0"
          />
          <SignupStepProgress step={5} />
          <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-50 mb-2">
            {t("signup.step5.bio")} {t("signup.optional")}
          </Text>
          <Controller
            control={control}
            name="bio"
            render={({ field: { value, onChange } }) => (
              <View className="mb-4">
                <TextInput
                multiline
                maxLength={300}
                className="border-2 border-neutral-200 dark:border-neutral-700 rounded-xl p-3 text-base text-neutral-900 dark:text-neutral-50 min-h-[100px]"
                placeholder={t("signup.step5.bioPlaceholder")}
                placeholderTextColor="#9CA3AF"
                value={value}
                onChangeText={onChange}
              />
              <Text className="text-xs text-neutral-400 text-right mt-1">{bioLen}/300</Text>
            </View>
          )}
        />

        <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-50 mb-2">
          {t("signup.step5.photo")} {t("signup.optional")}
        </Text>
        <Pressable onPress={pickImage} accessibilityRole="button" className="mb-3 items-center">
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={{ width: 112, height: 112, borderRadius: 56 }} contentFit="cover" />
          ) : (
            <View className="w-28 h-28 rounded-full bg-neutral-200 dark:bg-neutral-800 items-center justify-center">
              <Text className="text-primary dark:text-primary-dark font-semibold">{t("signup.step5.photo")}</Text>
            </View>
          )}
        </Pressable>
        <Text className="text-xs text-neutral-500 text-center mb-4">{t("signup.step5.photoHint")}</Text>

        <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-50 mb-2">{t("signup.step5.discovery")}</Text>
        <Controller
          control={control}
          name="discovery"
          render={({ field: { value, onChange } }) => (
            <View className="flex-row flex-wrap mb-4">
              {DISCOVERY_SOURCES.map((o) => {
                const label = t(o.labelKey as never);
                const selected = value === o.key;
                return (
                  <Pressable
                    key={o.key}
                    onPress={() => onChange(selected ? "" : o.key)}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    className={selected ? "px-3 py-2 rounded-full mr-2 mb-2 bg-primary" : "px-3 py-2 rounded-full mr-2 mb-2 bg-neutral-200 dark:bg-neutral-800"}
                  >
                    <Text className={selected ? "text-white text-xs" : "text-xs text-neutral-800 dark:text-neutral-100"}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        />
        {watch("discovery") === OTHER_KEY ? (
          <Controller
            control={control}
            name="discoveryDetails"
            render={({ field: { value, onChange } }) => (
              <Input
                label={t("signup.step5.discoveryDetailsLabel")}
                value={value ?? ""}
                onChangeText={onChange}
                placeholder={t("signup.step5.discoveryDetailsPlaceholder")}
                multiline
              />
            )}
          />
        ) : null}

          <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-50 mb-3">
            {t("signup.step5.legalTitle")}
          </Text>
          <Controller
            control={control}
            name="acceptTerms"
            render={({ field: { value, onChange } }) => (
              <Pressable
                onPress={() => router.push("/auth/signup/legal?document=terms")}
                accessibilityRole="button"
                className={`flex-row items-center justify-between border-2 rounded-xl px-4 py-3 mb-3 ${
                  value
                    ? "border-primary bg-primary/5 dark:bg-primary/10"
                    : "border-neutral-200 dark:border-neutral-700 bg-surface dark:bg-surface-dark"
                }`}
              >
                <Text className={`flex-1 text-base font-medium pr-4 ${
                  value ? "text-primary dark:text-primary-dark" : "text-neutral-900 dark:text-neutral-50"
                }`}>{t("signup.step5.acceptTerms")}</Text>
                <Switch value={value} onValueChange={onChange} accessibilityLabel={t("signup.step5.acceptTerms")} />
              </Pressable>
            )}
          />
          {errors.acceptTerms ? (
            <Text className="text-error text-sm mb-2">{localizeError(errors.acceptTerms.message, language)}</Text>
          ) : null}

          <Controller
            control={control}
            name="acceptPrivacy"
            render={({ field: { value, onChange } }) => (
              <Pressable
                onPress={() => router.push("/auth/signup/legal?document=privacy")}
                accessibilityRole="button"
                className={`flex-row items-center justify-between border-2 rounded-xl px-4 py-3 mb-3 ${
                  value
                    ? "border-primary bg-primary/5 dark:bg-primary/10"
                    : "border-neutral-200 dark:border-neutral-700 bg-surface dark:bg-surface-dark"
                }`}
              >
                <Text className={`flex-1 text-base font-medium pr-4 ${
                  value ? "text-primary dark:text-primary-dark" : "text-neutral-900 dark:text-neutral-50"
                }`}>{t("signup.step5.acceptPrivacy")}</Text>
                <Switch value={value} onValueChange={onChange} accessibilityLabel={t("signup.step5.acceptPrivacy")} />
              </Pressable>
            )}
          />
          {errors.acceptPrivacy ? (
            <Text className="text-error text-sm mb-2">{localizeError(errors.acceptPrivacy.message, language)}</Text>
          ) : null}

          <View className="flex-row gap-3 mt-6">
            <Button title={t("signup.back")} variant="secondary" onPress={() => router.back()} className="w-24" />
            <Button title={t("signup.step5.createAccount")} onPress={onSubmit} loading={submitting} className="flex-1" />
          </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeScreen>
  );
}