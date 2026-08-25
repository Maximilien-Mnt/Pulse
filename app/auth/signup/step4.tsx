import { Button } from "@/components/ui/Button";
import { SafeScreen } from "@/components/shared/SafeScreen";
import { Header } from "@/components/shared/Header";
import { SignupStepProgress } from "@/components/signup/SignupStepProgress";
import { Input } from "@/components/ui/Input";
import { OBJECTIVES, SPORTS } from "@/lib/constants";
import { useSignupStore } from "@/stores/signupStore";
import { signupStep4Schema } from "@/utils/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { Pressable, ScrollView, Text, View } from "react-native";
import { z } from "zod";
import { usePostHog } from "posthog-react-native";
import { useTranslation } from "@/hooks/useTranslation";
import type { TranslationKey } from "@/lib/translations";

type Form = z.infer<typeof signupStep4Schema>;

/** Maps the French OBJECTIVES constants to their translation keys. */
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
};

export default function SignupStep4() {
  const router = useRouter();
  const posthog = usePostHog();
  const { t } = useTranslation();
  const setStep4 = useSignupStore((s) => s.setStep4);
  const { control, handleSubmit, watch, setValue } = useForm<Form>({
    resolver: zodResolver(signupStep4Schema),
    defaultValues: { interestedSports: [], objectives: [], heightCm: "", weightKg: "" },
  });

  const interested = watch("interestedSports");
  const objectives = watch("objectives");

  const toggle = (field: "interestedSports" | "objectives", value: string) => {
    const cur = watch(field);
    if (cur.includes(value)) setValue(field, cur.filter((x) => x !== value), { shouldValidate: true });
    else setValue(field, [...cur, value], { shouldValidate: true });
  };

  const onSubmit = handleSubmit((values) => {
    setStep4({
      interestedSports: values.interestedSports,
      objectives: values.objectives,
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
      <Header
        title={t("signup.step4.title")}
        showBackButton
        backToLanding
        titleClassName="text-2xl text-neutral-900 dark:text-neutral-50"
        className="px-4 pt-2 pb-3 mb-0"
      />
      <SignupStepProgress step={4} />
      <ScrollView contentContainerClassName="px-6 py-4 pb-10">
        <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-50 mb-2">
          {t("signup.step4.interested")} {t("signup.optional")}
        </Text>
        <View className="flex-row flex-wrap mb-4">
          {SPORTS.map((s) => {
            const on = interested.includes(s.id);
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
        <View className="flex-row gap-3">
          <Controller
            control={control}
            name="heightCm"
            render={({ field: { value, onChange } }) => (
              <Input
                label={`${t("signup.step4.height")} ${t("signup.optional")}`}
                value={value ?? ""}
                onChangeText={onChange}
                keyboardType="number-pad"
                className="flex-1"
              />
            )}
          />
          <Controller
            control={control}
            name="weightKg"
            render={({ field: { value, onChange } }) => (
              <Input
                label={`${t("signup.step4.weight")} ${t("signup.optional")}`}
                value={value ?? ""}
                onChangeText={onChange}
                keyboardType="numeric"
                className="flex-1"
              />
            )}
          />
        </View>
        <View className="flex-row gap-3 mt-6">
          <Button title={t("signup.back")} variant="secondary" onPress={() => router.back()} />
          <Button title={t("signup.continue")} onPress={onSubmit} className="flex-1" />
        </View>
      </ScrollView>
    </SafeScreen>
  );
}