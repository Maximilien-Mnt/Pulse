import { Button } from "@/components/ui/Button";
import { SafeScreen } from "@/components/shared/SafeScreen";
import { Input } from "@/components/ui/Input";
import { supabase } from "@/lib/supabase";
import { getRedirectUrl } from "@/lib/constants";
import { forgotPasswordSchema } from "@/utils/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useRouter } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { usePostHog } from "posthog-react-native";
import Toast from "react-native-toast-message";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";

type Form = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const posthog = usePostHog();

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
      // Don't reveal whether the email exists — show a generic error
      Toast.show({
        type: "error",
        text1: "Une erreur est survenue",
        text2: "Veuillez réessayer plus tard.",
      });
      posthog.capture("password_reset_requested", { success: false, error: error.message });
      return;
    }

    // Always show the same success message regardless of whether the email exists
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
          <Text className="text-3xl font-bold text-primary mb-2">Pulse</Text>
          <View className="items-center mt-12 mb-8">
            <View className="w-20 h-20 rounded-full bg-primary/10 items-center justify-center mb-6">
              <Ionicons name="mail-outline" size={48} color="#1E6BFF" />
            </View>
            <Text className="text-2xl font-bold text-neutral-900 dark:text-neutral-50 mb-2">
              Email envoyé
            </Text>
            <Text className="text-neutral-600 dark:text-neutral-300 text-center">
              Si ce compte existe, un email de réinitialisation vient d'être envoyé.
              Cliquez sur le lien dans l'email pour choisir un nouveau mot de passe.
            </Text>
          </View>
          <View className="mt-8">
            <Button
              title="Retour à la connexion"
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
        <Text className="text-3xl font-bold text-primary mb-2">Pulse</Text>
        <Text className="text-neutral-600 dark:text-neutral-300 mb-8">
          Mot de passe oublié ?
        </Text>
        <Text className="text-neutral-600 dark:text-neutral-300 mb-6">
          Saisissez votre email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
        </Text>
        <Controller
          control={control}
          name="email"
          render={({ field: { value, onChange } }) => (
            <Input
              label="Email"
              value={value}
              onChangeText={onChange}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="vous@exemple.com"
              error={errors.email?.message}
            />
          )}
        />
        <Button title="Envoyer le lien" onPress={onSubmit} loading={isSubmitting} />
        <View className="flex-row justify-center mt-8">
          <Text className="text-neutral-600 dark:text-neutral-300">Retour à la connexion ? </Text>
          <Link href="/auth/signin" asChild>
            <Pressable>
              <Text className="text-primary font-semibold">Se connecter</Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
    </SafeScreen>
  );
}
