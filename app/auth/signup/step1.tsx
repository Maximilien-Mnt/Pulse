import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LANGUAGES } from "@/lib/constants";
import { supabase } from "@/lib/supabase";
import { useSignupStore } from "@/stores/signupStore";
import { signupStep1Schema } from "@/utils/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Stack, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { z } from "zod";
import { usePostHog } from "posthog-react-native";

type Form = z.infer<typeof signupStep1Schema>;

export default function SignupStep1() {
  const router = useRouter();
  const posthog = usePostHog();
  const setStep1 = useSignupStore((s) => s.setStep1);
  const [langOpen, setLangOpen] = useState(false);
  const [usernameOk, setUsernameOk] = useState<boolean | null>(null);

  const { control, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(signupStep1Schema),
    defaultValues: {
      language: "fr",
      fullName: "",
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const username = watch("username");
  const language = watch("language");

  const langLabel = useMemo(
    () => LANGUAGES.find((l) => l.code === language)?.label ?? "Français",
    [language]
  );

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

  return (
    <KeyboardAvoidingView className="flex-1 bg-neutral-50 dark:bg-[#0A0F1E]" behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Stack.Screen options={{ title: "Étape 1/5" }} />
      <ScrollView contentContainerClassName="px-6 py-4" keyboardShouldPersistTaps="handled">
        <Text className="text-lg font-semibold text-neutral-900 dark:text-neutral-50 mb-4">Créer un compte</Text>
        <Text className="text-sm text-neutral-500 mb-2">Langue</Text>
        <Pressable onPress={() => setLangOpen(true)} className="border-2 border-neutral-200 dark:border-neutral-700 rounded-xl p-4 mb-4">
          <Text className="text-base text-neutral-900 dark:text-neutral-50">{langLabel}</Text>
        </Pressable>
        <Modal visible={langOpen} transparent animationType="fade">
          <Pressable className="flex-1 bg-black/40 justify-end" onPress={() => setLangOpen(false)}>
            <View className="bg-white dark:bg-neutral-900 rounded-t-2xl p-4 max-h-[50%]">
              <FlatList
                data={[...LANGUAGES]}
                keyExtractor={(i) => i.code}
                renderItem={({ item }) => (
                  <Pressable
                    className="py-3 border-b border-neutral-100 dark:border-neutral-800"
                    onPress={() => {
                      setValue("language", item.code, { shouldValidate: true });
                      setLangOpen(false);
                    }}
                  >
                    <Text className="text-lg text-neutral-900 dark:text-neutral-50">{item.label}</Text>
                  </Pressable>
                )}
              />
            </View>
          </Pressable>
        </Modal>
        <Controller
          control={control}
          name="fullName"
          render={({ field: { value, onChange } }) => (
            <Input label="Nom complet" value={value} onChangeText={onChange} error={errors.fullName?.message} />
          )}
        />
        <Controller
          control={control}
          name="username"
          render={({ field: { value, onChange } }) => (
            <View>
              <Input label="Nom d&apos;utilisateur" value={value} onChangeText={onChange} autoCapitalize="none" error={errors.username?.message} />
              {usernameOk === true ? <Text className="text-success text-sm -mt-2 mb-2">✓ Disponible</Text> : null}
              {usernameOk === false ? <Text className="text-error text-sm -mt-2 mb-2">✗ Déjà pris</Text> : null}
            </View>
          )}
        />
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
        <Controller
          control={control}
          name="confirmPassword"
          render={({ field: { value, onChange } }) => (
            <Input label="Confirmer le mot de passe" value={value} onChangeText={onChange} secureTextEntry error={errors.confirmPassword?.message} />
          )}
        />
        <View className="mt-4">
          <Button title="Continuer" onPress={onSubmit} loading={isSubmitting} disabled={usernameOk === false} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
