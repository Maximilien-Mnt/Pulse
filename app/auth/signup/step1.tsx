import { Button } from "@/components/ui/Button";
import { SafeScreen } from "@/components/shared/SafeScreen";
import { Input } from "@/components/ui/Input";
import { Icon } from "@/components/ui/Icon";
import { Header } from "@/components/shared/Header";
import { supabase } from "@/lib/supabase";
import { useSignupStore } from "@/stores/signupStore";
import { signupStep1Schema } from "@/utils/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useRouter } from "expo-router";
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
  const [usernameOk, setUsernameOk] = useState<boolean | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { control, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(signupStep1Schema),
    defaultValues: {
      language: useLanguageStore.getState().language,
      fullName: "",
      username: "",
      email: "",
      password: "",
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
            className="mb-6"
          />

          <Text className="text-sm text-neutral-500 mb-2">{t("common.language")}</Text>
          <View className="border-2 border-neutral-200 dark:border-neutral-700 rounded-xl p-4 mb-4">
            <Text className="text-base text-neutral-900 dark:text-neutral-50">{languageLabel}</Text>
          </View>
          <Controller
            control={control}
            name="fullName"
            render={({ field: { value, onChange } }) => (
              <Input
                label={t("signup.step1.fullName")}
                value={value}
                onChangeText={onChange}
                error={errors.fullName?.message}
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
                  error={errors.username?.message}
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
                error={errors.email?.message}
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
                error={errors.password?.message}
                rightElement={
                  <Pressable
                    onPress={() => setShowPassword((prev) => !prev)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={showPassword ? "Hide password" : "Show password"}
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
                error={errors.confirmPassword?.message}
                rightElement={
                  <Pressable
                    onPress={() => setShowConfirmPassword((prev) => !prev)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={showConfirmPassword ? "Hide password" : "Show password"}
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
          <Button
            title={t("signup.step1.continue")}
            onPress={onSubmit}
            loading={isSubmitting}
            disabled={usernameOk === false}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeScreen>
  );
}
