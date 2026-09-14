import { Button } from "@/components/ui/Button";
import { SafeScreen } from "@/components/shared/SafeScreen";
import { Input } from "@/components/ui/Input";
import { Icon } from "@/components/ui/Icon";
import { Header } from "@/components/shared/Header";
import { supabase } from "@/lib/supabase";
import { setStoredPassword } from "@/lib/passwordStorage";
import { signInSchema } from "@/utils/validation";
import { localizeError } from "@/utils/localizeError";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import Toast from "react-native-toast-message";
import { z } from "zod";
import { usePostHog } from "posthog-react-native";
import { useTranslation, t } from "@/hooks/useTranslation";
import { useState } from "react";
import { reportError } from "@/lib/reporting/errorReport";
import { userFacingMessageFor } from "@/lib/reporting/userMessage";

type Form = z.infer<typeof signInSchema>;

export default function SignInScreen() {
  const router = useRouter();
  const posthog = usePostHog();
  const { t, language } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: values.email.trim(),
      password: values.password,
    });
    if (error) {
      reportError(error, { operation: "auth.signIn", route: "/auth/signin" });
      Toast.show({
        type: "error",
        text1: t("common.error"),
        text2: userFacingMessageFor(error),
      });
      return;
    }
    const userId = data.session?.user?.id;
    if (userId) {
      await setStoredPassword(userId, values.password);
      posthog.identify(userId, {
        $set_once: { first_sign_in_date: new Date().toISOString() },
      });
    }
    posthog.capture("user_signed_in");
    router.replace("/(tabs)/feed");
  });

  return (
    <SafeScreen edges={["top"]} className="bg-neutral-50 dark:bg-[#0A0F1E]">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerClassName="px-6 pt-4 pb-10" keyboardShouldPersistTaps="handled">
          <Header
            title={t("auth.signin.title")}
            showBackButton
            backToLanding
            centerTitle
            titleClassName="text-lg font-bold text-neutral-900 dark:text-neutral-50"
            className="mb-6"
          />

          <Text className="text-3xl font-bold text-primary mb-2">Pulse</Text>
          <Text className="text-neutral-600 dark:text-neutral-300 text-base mb-8">
            {t("auth.signin.subtitle")}
          </Text>

          <Controller
            control={control}
            name="email"
            render={({ field: { value, onChange } }) => (
              <Input
                label={t("auth.signin.email")}
                value={value}
                onChangeText={onChange}
                keyboardType="email-address"
                autoCapitalize="none"
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
                label={t("auth.signin.password")}
                value={value}
                onChangeText={onChange}
                secureTextEntry={!showPassword}
                error={localizeError(errors.password?.message, language)}
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
          <Button
            title={t("auth.signin.submit")}
            onPress={onSubmit}
            loading={isSubmitting}
            className="mb-3"
          />
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Button
                title={t("auth.signin.forgotPassword")}
                variant="secondary"
                onPress={() => router.push("/auth/forgot-password")}
              />
            </View>
            <View className="flex-1">
              <Button
                title={t("auth.signin.signup")}
                variant="secondary"
                onPress={() => router.push("/auth/signup/step1")}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeScreen>
  );
}
