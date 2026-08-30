import { Button } from "@/components/ui/Button";
import { SafeScreen } from "@/components/shared/SafeScreen";
import { Header } from "@/components/shared/Header";
import { SignupStepProgress } from "@/components/signup/SignupStepProgress";
import { Input } from "@/components/ui/Input";
import { NativePicker } from "@/components/ui/NativePicker";
import { OBJECTIVES, SPORTS } from "@/lib/constants";
import { useSignupStore } from "@/stores/signupStore";
import { signupStep4Schema } from "@/utils/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { z } from "zod";
import { usePostHog } from "posthog-react-native";
import { useTranslation , t } from "@/hooks/useTranslation";
import type { TranslationKey } from "@/lib/translations";

type Form = z.infer<typeof signupStep4Schema>;

const OBJECTIVE_KEYS: Record<string, TranslationKey> = {
  "Perdre du poids": "signup.objective.lose",
  "Prendre du muscle": "signup.objective.muscle",
  "Améliorer mon endurance": "signup.objective.endurance",
  "Reprendre le sport": "signup.objective.resume",
  "Rencontrer des partenaires": "signup.objective.meet",
  "Participer à des compétitions": "signup.objective.compete",
  "Réduire le stress": "signup.objective.stress",
  "Améliorer ma souplesse": "signup.objective.flexibility",
  "Préparer un objectif (course, triathlon…)": "signup.objective.goal",
  "Découvrir un nouveau sport": "signup.objective.discover",
  "Autre": "signup.objective.other",
};

export default function SignupStep4() {
  const router = useRouter();
  const posthog = usePostHog();
  const { t } = useTranslation();
  const setStep4 = useSignupStore((s) => s.setStep4);
  const step4 = useSignupStore((s) => s.step4);
  const mounted = useRef(false);
  const [objectivesDetails, setObjectivesDetails] = useState(step4?.objectivesDetails ?? "");
  const { control, handleSubmit, watch, setValue } = useForm<Form>({
    resolver: zodResolver(signupStep4Schema),
    defaultValues: {
      interestedSports: step4?.interestedSports ?? [],
      objectives: step4?.objectives ?? [],
      heightCm: step4?.heightCm ?? "",
      weightKg: step4?.weightKg ?? "",
    },
  });

  const mountedStep4 = useRef(false);
  const interestedSports = watch("interestedSports");
  const objectives = watch("objectives");
  const heightCm = watch("heightCm");
  const weightKg = watch("weightKg");

  useEffect(() => {
    if (!mountedStep4.current) {
      mountedStep4.current = true;
      return;
    }
    setStep4({
      interestedSports,
      objectives,
      objectivesDetails: objectivesDetails || undefined,
      heightCm,
      weightKg,
    });
  }, [interestedSports, objectives, objectivesDetails, heightCm, weightKg]);

  const toggle = (field: "interestedSports" | "objectives", value: string) => {
    if (field === "objectives" && value === "Autre") {
      const on = watch("objectives").includes("Autre");
      setValue("objectives", on ? [] : ["Autre"], { shouldValidate: true });
      setObjectivesDetails("");
      return;
    }
    const cur = watch(field);
    if (cur.includes(value)) setValue(field, cur.filter((x) => x !== value), { shouldValidate: true });
    else setValue(field, [...cur, value], { shouldValidate: true });
  };

  const onSubmit = handleSubmit((values) => {
    setStep4({
      interestedSports: values.interestedSports,
      objectives: values.objectives,
      objectivesDetails: objectivesDetails || undefined,
      heightCm: values.heightCm,
      weightKg: values.weightKg,
    });
    posthog.capture("signup_step_completed", {
      step: 4,
      objectives_count: values.objectives.length,
      interested_sports_count: values.interestedSports.length,
    });
    router.push("/auth/signup/step5");
  });

  return (
    <SafeScreen edges={["top"]} className="bg-neutral-50 dark:bg-[#0A0F1E]">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerClassName="px-6 py-4 pb-10" keyboardShouldPersistTaps="handled">
          <Header
            title={t("signup.step4.title")}
            showBackButton
            backToLanding
            titleClassName="text-2xl text-neutral-900 dark:text-neutral-50"
            className="mb-2 px-0"
          />
          <SignupStepProgress step={4} />
          <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-50 mb-2">
          {t("signup.step4.interested")} {t("signup.optional")}
        </Text>
        <View className="flex-row flex-wrap mb-4">
          {SPORTS.map((s) => {
            const on = interestedSports.includes(s.id);
            return (
              <Pressable
                key={s.id}
                onPress={() => toggle("interestedSports", s.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                className={`px-3 py-2 rounded-full mr-2 mb-2 ${on ? "bg-primary" : "bg-neutral-200 dark:bg-neutral-800"}`}
              >
                <Text className={on ? "text-white" : "text-neutral-800 dark:text-neutral-100"}>
                  {t(`signup.sport.${s.id}`)}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-50 mb-2">
          {t("signup.step4.objectives")} {t("signup.optional")}
        </Text>
        <View className="flex-row flex-wrap mb-4">
          {OBJECTIVES.map((o) => {
            const key = OBJECTIVE_KEYS[o] ?? (o as TranslationKey);
            const label = t(key);
            const on = objectives.includes(label);
            return (
              <Pressable
                key={o}
                onPress={() => toggle("objectives", label)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                className={`px-3 py-2 rounded-full mr-2 mb-2 ${on ? "bg-primary" : "bg-neutral-200 dark:bg-neutral-800"}`}
              >
                <Text className={on ? "text-white text-xs" : "text-xs text-neutral-800 dark:text-neutral-100"}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
        {objectives.includes("Autre") && (
          <Controller
            control={control}
            name="objectivesDetails"
            render={({ field: { value, onChange } }) => (
              <Input
                label={t("signup.step4.objectivesDetailsLabel")}
                value={value ?? ""}
                onChangeText={(text) => { onChange(text); setObjectivesDetails(text); }}
                placeholder={t("signup.step4.objectivesDetailsPlaceholder")}
                multiline
                numberOfLines={3}
                className="mb-4"
              />
            )}
          />
        )}
        <View className="flex-row gap-3">
          <Controller
            control={control}
            name="heightCm"
            render={({ field: { value, onChange } }) => (
              <View className="flex-1">
                <NativePicker
                  title={t("signup.step4.height")}
                  options={Array.from({ length: 151 }, (_, i) => ({ value: String(100 + i), label: `${100 + i} cm` }))}
                  selectedValue={value ?? ""}
                  onSelect={(v) => onChange(v as string)}
                  placeholder={`${t("signup.step4.height")} ${t("signup.optional")}`}
                  renderTrigger={(label) => (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t("signup.step4.height")}
                      className="border-[1.5px] border-border bg-surface px-4 h-12 rounded-sm flex-row items-center justify-between"
                    >
                      <Text className={`text-base ${value ? "text-text-primary" : "text-text-tertiary"}`}>{label}</Text>
                      <Text className="text-text-tertiary text-lg">›</Text>
                    </Pressable>
                  )}
                />
              </View>
            )}
          />
          <Controller
            control={control}
            name="weightKg"
            render={({ field: { value, onChange } }) => (
              <View className="flex-1">
                <NativePicker
                  title={t("signup.step4.weight")}
                  options={Array.from({ length: 171 }, (_, i) => ({ value: String(30 + i), label: `${30 + i} kg` }))}
                  selectedValue={value ?? ""}
                  onSelect={(v) => onChange(v as string)}
                  placeholder={`${t("signup.step4.weight")} ${t("signup.optional")}`}
                  renderTrigger={(label) => (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t("signup.step4.weight")}
                      className="border-[1.5px] border-border bg-surface px-4 h-12 rounded-sm flex-row items-center justify-between"
                    >
                      <Text className={`text-base ${value ? "text-text-primary" : "text-text-tertiary"}`}>{label}</Text>
                      <Text className="text-text-tertiary text-lg">›</Text>
                    </Pressable>
                  )}
                />
              </View>
            )}
          />
        </View>
        <View className="flex-row items-center justify-between gap-3 mt-6">
        <Button
          title={t("signup.back")}
          variant="secondary"
          size="lg"
          icon="ChevronLeft"
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace("/");
          }}
        />

          <Button title={t("signup.continue")} size="lg" iconRight="ChevronRight" onPress={onSubmit} />
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeScreen>
  );
}