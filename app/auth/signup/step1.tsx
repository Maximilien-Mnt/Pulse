import { Button } from "@/components/ui/Button";
import { SafeScreen } from "@/components/shared/SafeScreen";
import { Input } from "@/components/ui/Input";
import { Icon } from "@/components/ui/Icon";
import { Header } from "@/components/shared/Header";
import { SignupStepProgress } from "@/components/signup/SignupStepProgress";
import { NativePicker } from "@/components/ui/NativePicker";
import { supabase } from "@/lib/supabase";
import { useSignupStore } from "@/stores/signupStore";
import { signupStep1Schema } from "@/utils/validation";
import { localizeError } from "@/utils/localizeError";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { z } from "zod";
import { usePostHog } from "posthog-react-native";
import { useTranslation } from "@/hooks/useTranslation";
import { useLanguageStore } from "@/stores/languageStore";

type Form = z.infer<typeof signupStep1Schema>;

export default function SignupStep1() {
  const router = useRouter();
  const posthog = usePostHog();
  const { t, language } = useTranslation();
  const setStep1 = useSignupStore((s) => s.setStep1);
  const step1 = useSignupStore((s) => s.step1);
  const [usernameOk, setUsernameOk] = useState<boolean | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);

  const { control, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(signupStep1Schema),
    defaultValues: {
      language: useLanguageStore.getState().language,
      fullName: step1?.fullName ?? "",
      username: step1?.username ?? "",
      email: step1?.email ?? "",
      password: step1?.password ?? "",
      confirmPassword: "",
    },
  });

  const username = watch("username");

  const checkUsername = useCallback(async (u: string) => {
    if (u.length < 3) {
      setUsernameOk(null);
      return;
    }
    const { data, error } = await supabase.rpc("check_username_available", { p_username: u });
    if (error) {
      setUsernameOk(null);
      return;
    }
    setUsernameOk(!!data);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      void checkUsername(username.trim());
    }, 500);
    return () => clearTimeout(t);
  }, [username, checkUsername]);

  const onSubmit = handleSubmit((values) => {
    if (usernameOk === false) return;
    setStep1({
      language: values.language,
      fullName: values.fullName.trim(),
      username: values.username.trim(),
      email: values.email.trim(),
      password: values.password,
    });
    posthog.capture("signup_step_completed", { step: 1, language: values.language });
    router.push("/auth/signup/step2");
  });

  const languageLabel = language === "fr" ? t("common.french") : t("common.english");

  return (
    <SafeScreen edges={["top"]} className="bg-neutral-50 dark:bg-[#0A0F1E]">
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerClassName="px-6 pt-4 pb-10" keyboardShouldPersistTaps="handled">
          <Header
            title={t("signup.step1.title")}
            showBackButton
            backToLanding
            titleClassName="text-2xl text-neutral-900 dark:text-neutral-50"
            className="mb-2 px-0"
          />
          <SignupStepProgress step={1} />

          <Text className="text-sm text-neutral-500 mb-2">{t("common.language")}</Text>
          <Pressable
            onPress={() => setLanguageOpen(true)}
            className="border-2 border-neutral-200 dark:border-neutral-700 rounded-xl p-4 mb-4 flex-row items-center justify-between active:opacity-70"
            accessibilityRole="button"
            accessibilityLabel={t("common.language")}
          >
            <Text className="text-base text-neutral-900 dark:text-neutral-50">{languageLabel}</Text>
            <Text className="text-text-tertiary text-lg">›</Text>
          </Pressable>
          <NativePicker
            visible={languageOpen}
            title={t("common.language")}
            options={[
              { value: "fr", label: t("common.french") },
              { value: "en", label: t("common.english") },
            ]}
            selectedValue={language}
            onSelect={(value) => {
              setValue("language", value);
              useLanguageStore.getState().setLanguage(value);
              setLanguageOpen(false);
            }}
            onClose={() => setLanguageOpen(false)}
          />
          <Controller
            control={control}
            name="fullName"
            render={({ field: { value, onChange } }) => (
              <Input
                label={t("signup.step1.fullName")}
                value={value}
                onChangeText={onChange}
                textContentType="name"
                autoComplete="name"
                error={localizeError(errors.fullName?.message, language)}
                className="mb-4"
              />
            )}
          />
          <Controller
            control={control}
            name="username"
            render={({ field: { value, onChange } }) => (
              <View className="mb-4">
                <Input
                  label={t("signup.step1.username")}
                  value={value}
                  onChangeText={onChange}
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="username"
                  autoComplete="username"
                  error={localizeError(errors.username?.message, language)}
                />
                {usernameOk === true ? (
                  <Text className="text-success text-sm mt-1">{t("signup.step1.usernameAvailable")}</Text>
                ) : null}
                {usernameOk === false ? (
                  <Text className="text-error text-sm mt-1">{t("signup.step1.usernameTaken")}</Text>
                ) : null}
              </View>
            )}
          />
          <Controller
            control={control}
            name="email"
            render={({ field: { value, onChange } }) => (
              <Input
                label={t("signup.step1.email")}
                value={value}
                onChangeText={onChange}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="emailAddress"
                autoComplete="email"
                error={localizeError(errors.email?.message, language)}
                className="mb-4"
              />
            )}
          />
          <Controller
            control={control}
            name="password"
            render={({ field: { value, onChange } }) => (
              <Input
                label={t("signup.step1.password")}
                value={value}
                onChangeText={onChange}
                secureTextEntry={!showPassword}
                textContentType="newPassword"
                autoComplete="new-password"
                error={localizeError(errors.password?.message, language)}
                rightElement={
                  <Pressable
                    onPress={() => setShowPassword((prev) => !prev)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={showPassword ? t("signup.hidePassword") : t("signup.showPassword")}
                    className="p-1 active:opacity-70"
                  >
                    <Icon
                      name={showPassword ? "EyeOff" : "Eye"}
                      size={20}
                      color="text-secondary"
                    />
                  </Pressable>
                }
                className="mb-4"
              />
            )}
          />
          <Controller
            control={control}
            name="confirmPassword"
            render={({ field: { value, onChange } }) => (
              <Input
                label={t("signup.step1.confirmPassword")}
                value={value}
                onChangeText={onChange}
                secureTextEntry={!showConfirmPassword}
                textContentType="newPassword"
                autoComplete="new-password"
                error={localizeError(errors.confirmPassword?.message, language)}
                rightElement={
                  <Pressable
                    onPress={() => setShowConfirmPassword((prev) => !prev)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={showConfirmPassword ? t("signup.hidePassword") : t("signup.showPassword")}
                    className="p-1 active:opacity-70"
                  >
                    <Icon
                      name={showConfirmPassword ? "EyeOff" : "Eye"}
                      size={20}
                      color="text-secondary"
                    />
                  </Pressable>
                }
                className="mb-6"
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

            <Button
              title={t("signup.continue")}
              size="lg"
              iconRight="ChevronRight"
              onPress={onSubmit}
              loading={isSubmitting}
              disabled={usernameOk === false}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeScreen>
  );
}
