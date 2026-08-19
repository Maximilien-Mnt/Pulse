import { Button } from "@/components/ui/Button";
import { SafeScreen } from "@/components/shared/SafeScreen";
import { Input } from "@/components/ui/Input";
import { supabase } from "@/lib/supabase";
import { setStoredPassword } from "@/lib/passwordStorage";
import { signInSchema } from "@/utils/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useRouter } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import Toast from "react-native-toast-message";
import { z } from "zod";
import { usePostHog } from "posthog-react-native";

type Form = z.infer<typeof signInSchema>;

export default function SignInScreen() {
  const router = useRouter();
  const posthog = usePostHog();
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
      Toast.show({
        type: "error",
        text1: error.message.includes("fetch") ? "Vérifiez votre connexion internet" : error.message,
      });
      return;
    }
    const userId = data.session?.user?.id;
    if (userId) {
      // Store password securely so the user can view it in Settings.
      // Supabase only stores the hash, so we persist the plaintext on-device.
      await setStoredPassword(userId, values.password);
      posthog.identify(userId, {
        $set: { email: values.email.trim() },
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
        <Link href="/" asChild>
          <Pressable className="mb-4">
            <Text className="text-sm font-semibold text-primary">← Retour à l'accueil</Text>
          </Pressable>
        </Link>
        <Text className="text-3xl font-bold text-primary mb-2">Pulse</Text>
        <Text className="text-neutral-600 dark:text-neutral-300 mb-8">Connecte-toi pour continuer</Text>
        <Controller
          control={control}
          name="email"
          render={({ field: { value, onChange } }) => (
            <Input label="Email" value={value} onChangeText={onChange} keyboardType="email-address" autoCapitalize="none" error={errors.email?.message} />
          )}
        />
        <Controller
          control={control}
          name="password"
          render={({ field: { value, onChange } }) => (
            <Input label="Mot de passe" value={value} onChangeText={onChange} secureTextEntry error={errors.password?.message} />
          )}
        />
        <Link href="/auth/forgot-password" asChild>
          <Pressable className="mb-6">
            <Text className="text-primary font-semibold">Mot de passe oublié ?</Text>
          </Pressable>
        </Link>
        <Button title="Se connecter" onPress={onSubmit} loading={isSubmitting} />
        <View className="flex-row justify-center mt-8">
          <Text className="text-neutral-600 dark:text-neutral-300">Pas encore de compte ? </Text>
          <Link href="/auth/signup/step1" asChild>
            <Pressable>
              <Text className="text-primary font-semibold">S'inscrire</Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
    </SafeScreen>
  );
}
