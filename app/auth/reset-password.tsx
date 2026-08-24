import { Button } from "@/components/ui/Button";
import { SafeScreen } from "@/components/shared/SafeScreen";
import { Input } from "@/components/ui/Input";
import { Icon } from "@/components/ui/Icon";
import { Header } from "@/components/shared/Header";
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
import { useTranslation } from "@/hooks/useTranslation";

type Form = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordScreen() {
  const router = useRouter();
  const posthog = usePostHog();
  const { t } = useTranslation();
  const params = useGlobalSearchParams();
  const code = typeof params.code === "string" ? params.code : undefined;

  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  // On mount: establish the recovery session from the deep-link code.
  useEffect(() => {
    let alive = true;

    function parseHashTokens(): { access_token?: string; refresh_token?: string } | null {
      if (typeof window === "undefined") return null;
      const hash = window.location.hash;
      if (!hash || hash.length <= 1) return null;
      const params = new URLSearchParams(hash.slice(1));
      const access_token = params.get("access_token") || undefined;
      const refresh_token = params.get("refresh_token") || undefined;
      if (access_token || refresh_token) return { access_token, refresh_token };
      return null;
    }

    async function establishRecoverySession() {
      setLoading(true);
      setError(null);

      // On web, Supabase often puts recovery tokens in the URL hash
      // instead of a ?code= query param. If so, establish the session
      // directly from those tokens.
      const hashTokens = parseHashTokens();

      if (hashTokens?.access_token && hashTokens?.refresh_token) {
        try {
          const { data, error } = await supabase.auth.setSession({
            access_token: hashTokens.access_token,
            refresh_token: hashTokens.refresh_token,
          });
          if (data.session) {
            setLoading(false);
            if (alive) setReady(true);
            return;
          }
        } catch {
          // setSession threw, fall through to code-based flow
        }
      }

      // Attempt to exchange the deep-link code for a session.
      let exchangeError: { message: string } | null = null;
      let exchangedSession: { user: { id: string } } | null = null;
      if (code) {
        try {
          const result = await supabase.auth.exchangeCodeForSession(code);
          if (result.error) {
            exchangeError = result.error;
          } else {
            exchangedSession = result.data.session ?? null;
          }
        } catch {
          exchangeError = { message: "Unexpected error" };
        }
      }

      // If exchange succeeded and returned a session directly, use it.
      if (exchangedSession) {
        setLoading(false);
        if (alive) setReady(true);
        return;
      }

      // Fallback: getSession may return the session a moment later
      let session: { user: { id: string } } | null = null;
      const maxAttempts = 3;
      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        if (!alive) return;
        try {
          const { data } = await supabase.auth.getSession();
          session = data.session ?? null;
          if (session) break;
        } catch {
          // continue retrying
        }
        if (!session && attempt < maxAttempts - 1) {
          await new Promise((resolve) => setTimeout(resolve, 250));
        }
      }

      if (!alive) return;

      if (session) {
        setLoading(false);
        setReady(true);
      } else if (code && exchangeError) {
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
          <Header
            title="Pulse"
            showCancelButton
            className="mb-6"
          />
          <View className="items-center mt-6 mb-8">
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
          <View className="mt-4">
            <Button
              title="Demander un nouveau lien"
              onPress={() => router.replace("/auth/forgot-password")}
              variant="secondary"
              className="mb-3"
            />
            <Button
              title="Se connecter"
              variant="secondary"
              onPress={() => router.replace("/auth/signin")}
            />
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
          <Header
            title="Pulse"
            showCancelButton
            className="mb-6"
          />
          <View className="items-center mt-12 mb-8">
            <Text className="text-base text-neutral-600 dark:text-neutral-300">
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
        <Header
          title="Pulse"
          showCancelButton
          className="mb-6"
        />
        <Text className="text-2xl font-bold text-neutral-900 dark:text-neutral-50 mb-2">
          {t("auth.resetPassword.title")}
        </Text>
        <Text className="text-base text-neutral-600 dark:text-neutral-300 mb-6">
          {t("auth.resetPassword.description")}
        </Text>
        <Controller
          control={control}
          name="password"
          render={({ field: { value, onChange } }) => (
            <Input
              label={t("auth.resetPassword.newPassword")}
              value={value}
              onChangeText={onChange}
              secureTextEntry={!showPassword}
              placeholder="••••••••"
              error={errors.password?.message}
              rightElement={
                <Pressable
                  onPress={() => setShowPassword((prev) => !prev)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
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
              label={t("auth.resetPassword.confirmPassword")}
              value={value}
              onChangeText={onChange}
              secureTextEntry={!showConfirmPassword}
              placeholder="••••••••"
              error={errors.confirmPassword?.message}
              rightElement={
                <Pressable
                  onPress={() => setShowConfirmPassword((prev) => !prev)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={showConfirmPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  className="p-1 active:opacity-70"
                >
                  <Icon
                    name={showConfirmPassword ? "EyeOff" : "Eye"}
                    size={20}
                    color="text-secondary"
                  />
                </Pressable>
              }
              className="mb-4"
            />
          )}
        />
        <Button title={t("auth.resetPassword.submit")} onPress={onSubmit} loading={isSubmitting} className="mb-3" />
        <Button
          title={t("auth.resetPassword.backToSignin")}
          variant="secondary"
          onPress={() => router.replace("/auth/signin")}
        />
      </ScrollView>
    </KeyboardAvoidingView>
    </SafeScreen>
  );
}
