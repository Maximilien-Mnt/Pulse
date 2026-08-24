import { Button } from "@/components/ui/Button";
import { SafeScreen } from "@/components/shared/SafeScreen";
import { Input } from "@/components/ui/Input";
import { supabase } from "@/lib/supabase";
import { setStoredPassword } from "@/lib/passwordStorage";
import { resetPasswordSchema } from "@/utils/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useGlobalSearchParams } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { usePostHog } from "posthog-react-native";
import Toast from "react-native-toast-message";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";

type Form = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordScreen() {
  const router = useRouter();
  const posthog = usePostHog();
  const params = useGlobalSearchParams();
  const code = typeof params.code === "string" ? params.code : undefined;

  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  // On mount: establish the recovery session from the deep-link code.
  // If detectSessionInUrl is false (as in this project), we must manually
  // exchange the code for a session. If the code is missing and no recovery
  // session exists, we show an error and offer to request a new link.
  useEffect(() => {
    let alive = true;

    async function establishRecoverySession() {
      setLoading(true);
      setError(null);

      // Attempt to exchange the deep-link code for a session.
      // If this fails (e.g. token already consumed / expired), we still
      // check getSession() below because a recovery session may already
      // be present in storage (e.g. re-opened link, partial exchange).
      let exchangeFailed = false;
      if (code) {
        try {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            exchangeFailed = true;
          }
        } catch {
          exchangeFailed = true;
        }
      }

      const { data } = await supabase.auth.getSession();
      if (!alive) return;

      if (data.session) {
        setReady(true);
      } else if (code && exchangeFailed) {
        setError(
          "Ce lien de réinitialisation est invalide ou a expiré. " +
            "Veuillez demander un nouveau lien."
        );
      } else {
        setError(
          "Aucune session de récupération valide. " +
            "Veuillez demander un nouveau lien de réinitialisation."
        );
      }
    }

    void establishRecoverySession();

    return () => {
      alive = false;
    };
  }, [code]);

  const onSubmit = handleSubmit(async (values) => {
    const { data, error: updateError } = await supabase.auth.updateUser({
      password: values.password,
    });

    if (updateError) {
      Toast.show({
        type: "error",
        text1: "Erreur",
        text2: updateError.message,
      });
      posthog.capture("password_reset_completed", { success: false, error: updateError.message });
      return;
    }

    // Store the new password securely so the user can view it in Settings.
    // The recovery session user is available on the updated session.
    if (data.user?.id) {
      try {
        await setStoredPassword(data.user.id, values.password);
      } catch (storageError) {
        console.error("Failed to store new password securely:", storageError);
      }
    }

    posthog.capture("password_reset_completed", { success: true });

    // Sign out to clear the temporary recovery session, then redirect to sign-in
    await supabase.auth.signOut();

    router.replace("/auth/signin");
  });

  // If no valid recovery session, show an error state
  if (error) {
    return (
      <SafeScreen edges={["top"]} className="bg-neutral-50 dark:bg-[#0A0F1E]">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerClassName="px-6 pt-4 pb-10" keyboardShouldPersistTaps="handled">
          <Text className="text-3xl font-bold text-primary mb-2">Pulse</Text>
          <View className="items-center mt-12 mb-8">
            <View className="w-20 h-20 rounded-full bg-error/10 items-center justify-center mb-6">
              <Text className="text-4xl">⚠️</Text>
            </View>
            <Text className="text-2xl font-bold text-neutral-900 dark:text-neutral-50 mb-2">
              Lien invalide
            </Text>
            <Text className="text-neutral-600 dark:text-neutral-300 text-center">
              {error}
            </Text>
          </View>
          <View className="mt-8">
            <Button
              title="Demander un nouveau lien"
              onPress={() => router.replace("/auth/forgot-password")}
              variant="secondary"
            />
          </View>
          <View className="flex-row justify-center mt-4">
            <Text className="text-neutral-600 dark:text-neutral-300">Déjà un compte ? </Text>
            <Pressable onPress={() => router.replace("/auth/signin")}>
              <Text className="text-primary font-semibold">Se connecter</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      </SafeScreen>
    );
  }

  // While establishing the recovery session, show a loading state
  if (loading || !ready) {
    return (
      <SafeScreen edges={["top"]} className="bg-neutral-50 dark:bg-[#0A0F1E]">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerClassName="px-6 pt-4 pb-10" keyboardShouldPersistTaps="handled">
          <Text className="text-3xl font-bold text-primary mb-2">Pulse</Text>
          <View className="items-center mt-12 mb-8">
            <Text className="text-neutral-600 dark:text-neutral-300">
              Vérification de votre lien de réinitialisation…
            </Text>
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
          Nouveau mot de passe
        </Text>
        <Text className="text-neutral-600 dark:text-neutral-300 mb-6">
          Choisissez un nouveau mot de passe pour votre compte.
        </Text>
        <Controller
          control={control}
          name="password"
          render={({ field: { value, onChange } }) => (
            <Input
              label="Nouveau mot de passe"
              value={value}
              onChangeText={onChange}
              secureTextEntry
              placeholder="••••••••"
              error={errors.password?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="confirmPassword"
          render={({ field: { value, onChange } }) => (
            <Input
              label="Confirmer le mot de passe"
              value={value}
              onChangeText={onChange}
              secureTextEntry
              placeholder="••••••••"
              error={errors.confirmPassword?.message}
            />
          )}
        />
        <Button title="Réinitialiser le mot de passe" onPress={onSubmit} loading={isSubmitting} />
        <View className="flex-row justify-center mt-8">
          <Text className="text-neutral-600 dark:text-neutral-300">Retour à la connexion ? </Text>
          <Pressable onPress={() => router.replace("/auth/signin")}>
            <Text className="text-primary font-semibold">Se connecter</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
    </SafeScreen>
  );
}
