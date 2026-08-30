import { Button } from "@/components/ui/Button";
import { SafeScreen } from "@/components/shared/SafeScreen";
import { Input } from "@/components/ui/Input";
import { Header } from "@/components/shared/Header";
import { SignupStepProgress } from "@/components/signup/SignupStepProgress";
import { NativePicker } from "@/components/ui/NativePicker";
import { COMMON_COUNTRIES, flagEmoji } from "@/utils/countries";
import { useSignupStore } from "@/stores/signupStore";
import { signupStep2Schema } from "@/utils/validation";
import { localizeError } from "@/utils/localizeError";
import { zodResolver } from "@hookform/resolvers/zod";
import { NativeDateField } from "@/components/ui/NativeDateField";
import { useRouter } from "expo-router";
import dayjs from "dayjs";
import { Controller, useForm } from "react-hook-form";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { z } from "zod";
import { usePostHog } from "posthog-react-native";
import { useTranslation , t } from "@/hooks/useTranslation";

type Form = z.infer<typeof signupStep2Schema>;

const MAX_BIRTH_DATE = dayjs().subtract(16, "year").toDate();

export default function SignupStep2() {
  const router = useRouter();
  const posthog = usePostHog();
  const { t, language } = useTranslation();
  const setStep2 = useSignupStore((s) => s.setStep2);
  const step2 = useSignupStore((s) => s.step2);

  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(signupStep2Schema),
    defaultValues: {
      birthDate: step2?.birthDate ?? MAX_BIRTH_DATE,
      country: step2?.country ?? "FR",
      city: step2?.city ?? "",
    },
  });

  const onSubmit = handleSubmit((values) => {
    setStep2({
      birthDate: values.birthDate,
      country: values.country,
      city: values.city?.trim() || undefined,
    });
    posthog.capture("signup_step_completed", { step: 2, country: values.country });
    router.push("/auth/signup/step3");
  });

  return (
    <SafeScreen edges={["top"]} className="bg-neutral-50 dark:bg-[#0A0F1E]">
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerClassName="px-6 py-4 pb-10" keyboardShouldPersistTaps="handled">
          <Header
            title={t("signup.step2.title")}
            showBackButton
            backToLanding
            titleClassName="text-2xl text-neutral-900 dark:text-neutral-50"
            className="mb-2 px-0"
          />
          <SignupStepProgress step={2} />

          <Text className="text-sm text-neutral-500 mb-2">{t("signup.step2.birthDate")}</Text>
          <Controller
            control={control}
            name="birthDate"
            render={({ field: { value, onChange } }) => (
              <View className="mb-4">
                <NativeDateField
                  mode="date"
                  value={value}
                  onChange={(d) => onChange(d)}
                  maximumDate={MAX_BIRTH_DATE}
                  title={t("signup.step2.birthDate")}
                  confirmLabel={t("common.ok")}
                  cancelLabel={t("common.cancel")}
                  renderTrigger={() => (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t("signup.step2.birthDate")}
                      className="border-2 border-neutral-200 dark:border-neutral-700 rounded-xl px-4 py-4"
                    >
                      <Text className="text-base text-neutral-900 dark:text-neutral-50">
                        {dayjs(value).format("DD/MM/YYYY")}
                      </Text>
                    </Pressable>
                  )}
                />
                {errors.birthDate ? (
                  <Text className="text-error text-sm mt-2">{localizeError(errors.birthDate.message, language)}</Text>
                ) : null}
                <Text className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
                  {t("signup.step2.birthDateHelper")}
                </Text>
              </View>
            )}
          />

          <Text className="text-sm text-neutral-500 mb-2">{t("signup.step2.country")}</Text>
          <Controller
            control={control}
            name="country"
            render={({ field: { value, onChange } }) => (
              <View className="mb-4">
                <NativePicker
                  title={t("signup.step2.pickerTitle")}
                  confirmLabel={t("common.ok")}
                  cancelLabel={t("common.cancel")}
                  options={COMMON_COUNTRIES.map((c) => ({ value: c.code, label: `${flagEmoji(c.code)} ${c.label}` }))}
                  selectedValue={value}
                  onSelect={(v) => onChange(v)}
                  renderTrigger={(label) => (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t("signup.step2.selectCountry")}
                      className="border-2 border-neutral-200 dark:border-neutral-700 rounded-xl p-4 flex-row items-center justify-between"
                    >
                      <Text
                        className={
                          label
                            ? "text-base text-neutral-900 dark:text-neutral-50"
                            : "text-base text-neutral-400 dark:text-neutral-500"
                        }
                      >
                        {label || t("signup.step2.selectCountry")}
                      </Text>
                      <Text className="text-primary dark:text-primary-dark text-lg">›</Text>
                    </Pressable>
                  )}
                />
              </View>
            )}
          />

          <Controller
            control={control}
            name="city"
            render={({ field: { value, onChange } }) => (
              <Input
                label={`${t("signup.step2.city")} ${t("signup.optional")}`}
                value={value ?? ""}
                onChangeText={onChange}
                placeholder={t("signup.step2.cityPlaceholder")}
                textContentType="addressCity"
              />
            )}
          />

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

          <Button title={t("signup.continue")} size="lg" iconRight="ChevronRight" onPress={onSubmit} loading={isSubmitting} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeScreen>
  );
}