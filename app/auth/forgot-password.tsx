import { Button } from "@/components/ui/Button";
import { SafeScreen } from "@/components/shared/SafeScreen";
import { Input } from "@/components/ui/Input";
import { Header } from "@/components/shared/Header";
import { supabase } from "@/lib/supabase";
import { getRedirectUrl } from "@/lib/constants";
import { forgotPasswordSchema } from "@/utils/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { usePostHog } from "posthog-react-native";
import Toast from "react-native-toast-message";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { useTranslation } from "@/hooks/useTranslation";

type Form = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const posthog = usePostHog();
  const { t } = useTranslation();

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const [sent, setSent] = useState(false);

  const onSubmit = handleSubmit(async (values) => {
    const redirectTo = getRedirectUrl();
    const { error } = await supabase.auth.resetPasswordForEmail(values.email.trim(), {
      redirectTo,
    });

    if (error) {
      Toast.show({
        type: "error",
        text1: "Une erreur est survenue",
        text2: "Veuillez réessayer plus tard.",
      });
      posthog.capture("password_reset_requested", { success: false, error: error.message });
      return;
    }

    posthog.capture("password_reset_requested", { success: true });
    setSent(true);
  });

  if (sent) {
    return (
      <SafeScreen edges={["top"]} className="bg-neutral-50 dark:bg-[#0A0F1E]">
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView contentContainerClassName="px-6 pt-4 pb-10" keyboardShouldPersistTaps="handled">
            <Header
              title={t("auth.forgotPassword.sent.title")}
              showBackButton
              backToLanding
              centerTitle
              titleClassName="text-lg font-bold text-neutral-900 dark:text-neutral-50"
              className="mb-6"
            />
            <View className="items-center mt-12 mb-8">
              <View className="w-20 h-20 rounded-full bg-primary/10 items-center justify-center mb-6">
                <Ionicons name="mail-outline" size={48} color="#1E6BFF" />
              </View>
              <Text className="text-neutral-600 dark:text-neutral-300 text-center">
                {t("auth.forgotPassword.sent.description")}
              </Text>
            </View>
            <View className="mt-8">
              <Button
                title={t("auth.forgotPassword.backToSignin")}
                onPress={() => router.replace("/auth/signin")}
                variant="secondary"
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeScreen>
    );
  }

  return (
    <SafeScreen edges={["top"]} className="bg-neutral-50 dark:bg-[#0A0F1E]">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerClassName="px-6 pt-4 pb-10" keyboardShouldPersistTaps="handled">
          <Header
            title={t("auth.forgotPassword.title")}
            showBackButton
            backToLanding
            centerTitle
            titleClassName="text-lg font-bold text-neutral-900 dark:text-neutral-50"
            className="mb-6"
          />

          <Text className="text-neutral-600 dark:text-neutral-300 text-base mb-8">
            {t("auth.forgotPassword.subtitle")}
          </Text>

          <Controller
            control={control}
            name="email"
            render={({ field: { value, onChange } }) => (
              <Input
                label={t("auth.forgotPassword.email")}
                value={value}
                onChangeText={onChange}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="vous@exemple.com"
                error={errors.email?.message}
                className="mb-4"
              />
            )}
          />
          <Button
            title={t("auth.forgotPassword.submit")}
            onPress={onSubmit}
            loading={isSubmitting}
            className="mb-3"
          />
          <View className="mt-4">
            <Button
              title={t("auth.forgotPassword.backToSignin")}
              variant="secondary"
              onPress={() => router.replace("/auth/signin")}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeScreen>
  );
}
